import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOneOptions,
  In,
  Repository,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CreateOrderDTO } from './dtos/create-order.dto';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';
import { DeliveryRegion } from '../delivery-region/delivery-region.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { MenuItem } from '../menu-item/menu-item.entity';
import { RelMenuBranch } from '../menu-item/rel-menu-branch.entity';
import { OrderStatus } from 'src/core/enums/order-status';
import { ShiftStatus } from 'src/core/enums/shift-status';
import {
  assignNextOrderQueue,
  normalizeOrderQueueCounter,
} from 'src/core/utils/order-queue.util';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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
   * Snapshots unitPrice, menu names, deliveryFees, and serviceFee at creation time.
   */
  async createOrder(dto: CreateOrderDTO, creator?: string): Promise<Order> {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one order item is required');
    }

    return this.orderRepository.manager.transaction(async (manager) => {
      const branch = await manager.getRepository(Branch).findOne({
        where: { id: dto.branchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!branch) {
        throw new NotFoundException(`Branch ${dto.branchId} not found`);
      }

      const { assigned: orderQueue, next: nextOrderQueue } = assignNextOrderQueue(
        normalizeOrderQueueCounter(branch.nextOrderQueue ?? 0),
      );
      branch.nextOrderQueue = nextOrderQueue;
      await manager.getRepository(Branch).save(branch);

      let customer: User | undefined;
      if (dto.customerId) {
        customer =
          (await manager.getRepository(User).findOne({
            where: { id: dto.customerId },
          })) ?? undefined;
        if (!customer) {
          throw new NotFoundException(`Customer ${dto.customerId} not found`);
        }
      }

      let deliveryRegion: DeliveryRegion | undefined;
      let deliveryFees = 0;
      if (dto.deliveryRegionId) {
        deliveryRegion =
          (await manager.getRepository(DeliveryRegion).findOne({
            where: { id: dto.deliveryRegionId, branch: { id: dto.branchId } },
          })) ?? undefined;
        if (!deliveryRegion) {
          throw new NotFoundException(
            `Delivery region ${dto.deliveryRegionId} not found for branch ${dto.branchId}`,
          );
        }
        deliveryFees = deliveryRegion.deliveryPrice;
      }

      let shift: ShiftManagement | undefined;
      if (dto.shiftManagementId) {
        shift =
          (await manager.getRepository(ShiftManagement).findOne({
            where: { id: dto.shiftManagementId, branch: { id: dto.branchId } },
          })) ?? undefined;
        if (!shift) {
          throw new NotFoundException(
            `Shift ${dto.shiftManagementId} not found for branch ${dto.branchId}`,
          );
        }
        if (shift.status !== ShiftStatus.OPEN) {
          throw new BadRequestException(
            `Shift ${dto.shiftManagementId} is not open`,
          );
        }
      }

      const menuItemIds = dto.items.map((i) => i.menuItemId);
      const menuItems = await manager.getRepository(MenuItem).find({
        where: { id: In(menuItemIds), isActive: true },
      });
      if (menuItems.length !== menuItemIds.length) {
        const found = new Set(menuItems.map((m) => m.id));
        const missing = menuItemIds.filter((id) => !found.has(id));
        throw new NotFoundException(
          `Menu items not found or inactive: ${missing.join(', ')}`,
        );
      }

      const branchPrices = await manager.getRepository(RelMenuBranch).find({
        where: menuItemIds.map((menuItemId) => ({
          menuItemId,
          branchId: dto.branchId,
          isActive: true,
        })),
      });
      const priceByMenuItemId = new Map(
        branchPrices.map((rel) => [rel.menuItemId, rel.price]),
      );
      const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

      const orderItems: OrderItem[] = [];
      let itemsSubtotal = 0;

      for (const line of dto.items) {
        const menuItem = menuItemById.get(line.menuItemId)!;
        const unitPrice =
          priceByMenuItemId.get(line.menuItemId) ?? menuItem.defaultPrice;
        itemsSubtotal = roundMoney(
          itemsSubtotal + unitPrice * line.quantity,
        );

        const orderItem = manager.getRepository(OrderItem).create({
          menuItem,
          quantity: line.quantity,
          unitPrice,
          menuItemNameAr: menuItem.nameAr,
          menuItemNameEn: menuItem.nameEn,
          createdBy: creator,
          updatedBy: creator,
        });
        orderItems.push(orderItem);
      }

      const serviceFee = roundMoney(
        itemsSubtotal * (branch.servicePercentage ?? 0),
      );
      const totalAmount = roundMoney(
        itemsSubtotal + deliveryFees + serviceFee,
      );

      const order = manager.getRepository(Order).create({
        branch,
        customer,
        deliveryRegion,
        shift,
        orderQueue,
        itemsSubtotal,
        deliveryFees,
        serviceFee,
        totalAmount,
        status: OrderStatus.PENDING,
        items: orderItems,
        createdBy: creator,
        updatedBy: creator,
      });

      return manager.getRepository(Order).save(order);
    });
  }
}
