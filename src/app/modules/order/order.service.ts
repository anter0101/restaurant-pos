import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  In,
  Repository,
} from 'typeorm';
import { Order } from './order.entity';
import { CreateOrderDTO } from './dtos/create-order.dto';
import { Branch } from '../branch/branch.entity';
import { Customer } from '../customer/customer.entity';
import { DeliveryRegion } from '../delivery-region/delivery-region.entity';
import { MenuItem } from '../menu-item/menu-item.entity';
import { RelMenuBranch } from '../menu-item/rel-menu-branch.entity';
import { OrderType } from 'src/core/enums/order-type';
import {
  assertDeliveryRegionMatchesOrderType,
  assertOrderTypeAllowedForBranch,
} from 'src/core/utils/order-type.util';
import {
  assignNextOrderQueue,
  normalizeOrderQueueCounter,
} from 'src/core/utils/order-queue.util';
import {
  assertOrderTotalsMatch,
  calculateServiceFee,
  calculateTotalAmount,
} from 'src/core/utils/order-totals.util';
import { ShiftManagementService } from '../shift-management/shift-management.service';
import {
  calculateItemsSubtotal,
  mapCreateOrderItemsToEntities,
  mapCreateOrderToEntity,
} from './order.mapper';
import { User } from '../user/user.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly shiftManagementService: ShiftManagementService,
  ) {}

  async findById(id: number): Promise<Order | undefined> {
    const result = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.menuItem',
        'branch',
        'deliveryRegion',
        'shift',
        'customer',
        'customer.defaultDeliveryRegion',
      ],
    });
    return result ?? undefined;
  }

  async findByFields(
    options: FindOneOptions<Order>,
  ): Promise<Order | undefined> {
    const result = await this.orderRepository.findOne(options);
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<Order>,
  ): Promise<[Order[], number]> {
    return this.orderRepository.findAndCount(options);
  }

  /**
   * Creates an order with immutable price snapshots.
   * POS sends calculated totals; server recalculates and rejects mismatches.
   */
  async createOrder(dto: CreateOrderDTO, user: User): Promise<Order> {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one order item is required');
    }

    const branchId = user.branch?.id;
    if (!branchId) {
      throw new BadRequestException('User is not assigned to a branch');
    }

    const openShift =
      await this.shiftManagementService.findOpenShiftForCashier(
        user.id,
        branchId,
      );
    if (!openShift) {
      throw new BadRequestException(
        'No open shift found. Open a shift before creating orders.',
      );
    }

    if (dto.orderType !== OrderType.DELIVERY && dto.deliveryRegionId) {
      throw new BadRequestException(
        `deliveryRegionId is only allowed for DELIVERY orders, not ${dto.orderType}`,
      );
    }

    if (dto.orderType !== OrderType.DELIVERY && dto.deliveryAddress) {
      throw new BadRequestException(
        `deliveryAddress is only allowed for DELIVERY orders, not ${dto.orderType}`,
      );
    }

    if (dto.orderType !== OrderType.DELIVERY && dto.customDeliveryPrice !== undefined) {
      throw new BadRequestException(
        `customDeliveryPrice is only allowed for DELIVERY orders, not ${dto.orderType}`,
      );
    }

    return this.orderRepository.manager.transaction(async (manager) => {
      const branch = await manager.getRepository(Branch).findOne({
        where: { id: branchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!branch) {
        throw new NotFoundException(`Branch ${branchId} not found`);
      }

      assertOrderTypeAllowedForBranch(branch.type, dto.orderType);

      const { assigned: orderQueue, next: nextOrderQueue } =
        assignNextOrderQueue(
          normalizeOrderQueueCounter(branch.nextOrderQueue ?? 0),
        );
      branch.nextOrderQueue = nextOrderQueue;
      await manager.getRepository(Branch).save(branch);

      const customer = await this.resolveCustomer(manager, dto.customerId);

      const effectiveDeliveryAddress =
        dto.deliveryAddress?.trim() || customer?.address?.trim() || undefined;
      const effectiveDeliveryRegionId =
        dto.deliveryRegionId ?? customer?.defaultDeliveryRegion?.id;

      if (dto.orderType === OrderType.DELIVERY && !effectiveDeliveryAddress) {
        throw new BadRequestException(
          'deliveryAddress is required for DELIVERY orders',
        );
      }

      assertDeliveryRegionMatchesOrderType(
        dto.orderType,
        effectiveDeliveryRegionId,
      );

      const { deliveryRegion, deliveryFees } =
        await this.resolveDeliveryRegion(
          manager,
          dto.orderType,
          effectiveDeliveryRegionId,
          dto.customDeliveryPrice,
        );
      const { menuItemById, priceByMenuItemId } = await this.loadMenuPricing(
        manager,
        dto,
        branchId,
      );

      const orderItems = mapCreateOrderItemsToEntities(
        dto.items,
        menuItemById,
        priceByMenuItemId,
        user.username,
      );

      const serverItemsSubtotal = calculateItemsSubtotal(dto.items);
      const serverServiceFee = calculateServiceFee(
        dto.orderType,
        serverItemsSubtotal,
        branch.servicePercentage ?? 0,
      );
      const serverTotalAmount = calculateTotalAmount(
        serverItemsSubtotal,
        deliveryFees,
        serverServiceFee,
      );

      assertOrderTotalsMatch(
        {
          itemsSubtotal: dto.itemsSubtotal,
          deliveryFees: dto.deliveryFees,
          serviceFee: dto.serviceFee,
          totalAmount: dto.totalAmount,
        },
        {
          itemsSubtotal: serverItemsSubtotal,
          deliveryFees,
          serviceFee: serverServiceFee,
          totalAmount: serverTotalAmount,
        },
      );

      const order = mapCreateOrderToEntity({
        dto,
        branch,
        shift: openShift,
        customer,
        deliveryRegion,
        orderQueue,
        itemsSubtotal: serverItemsSubtotal,
        deliveryFees,
        deliveryAddress: effectiveDeliveryAddress,
        serviceFee: serverServiceFee,
        totalAmount: serverTotalAmount,
        orderItems,
        creator: user.username,
      });

      return manager.getRepository(Order).save(order);
    });
  }

  private async resolveCustomer(
    manager: EntityManager,
    customerId?: number,
  ): Promise<Customer | undefined> {
    if (!customerId) {
      return undefined;
    }

    const customer =
      (await manager.getRepository(Customer).findOne({
        where: { id: customerId },
        relations: ['defaultDeliveryRegion'],
      })) ?? undefined;
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    return customer;
  }

  private async resolveDeliveryRegion(
    manager: EntityManager,
    orderType: OrderType,
    deliveryRegionId?: number,
    customDeliveryPrice?: number,
  ): Promise<{ deliveryRegion?: DeliveryRegion; deliveryFees: number }> {
    if (orderType !== OrderType.DELIVERY) {
      return { deliveryFees: 0 };
    }

    const deliveryRegion =
      (await manager.getRepository(DeliveryRegion).findOne({
        where: { id: deliveryRegionId },
      })) ?? undefined;
    if (!deliveryRegion) {
      throw new NotFoundException(
        `Delivery region ${deliveryRegionId} not found`,
      );
    }

    const deliveryFees =
      customDeliveryPrice !== undefined
        ? customDeliveryPrice
        : deliveryRegion.deliveryPrice;

    return {
      deliveryRegion,
      deliveryFees,
    };
  }

  private async loadMenuPricing(
    manager: EntityManager,
    dto: CreateOrderDTO,
    branchId: number,
  ): Promise<{
    menuItemById: Map<number, MenuItem>;
    priceByMenuItemId: Map<number, number>;
  }> {
    const menuItemIds = dto.items.map((item) => item.menuItemId);
    const menuItems = await manager.getRepository(MenuItem).find({
      where: { id: In(menuItemIds), isActive: true },
    });
    if (menuItems.length !== menuItemIds.length) {
      const found = new Set(menuItems.map((item) => item.id));
      const missing = menuItemIds.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Menu items not found or inactive: ${missing.join(', ')}`,
      );
    }

    const branchPrices = await manager.getRepository(RelMenuBranch).find({
      where: menuItemIds.map((menuItemId) => ({
        menuItemId,
        branchId,
        isActive: true,
      })),
    });

    return {
      menuItemById: new Map(menuItems.map((item) => [item.id, item])),
      priceByMenuItemId: new Map(
        branchPrices.map((rel) => [rel.menuItemId, rel.price]),
      ),
    };
  }
}
