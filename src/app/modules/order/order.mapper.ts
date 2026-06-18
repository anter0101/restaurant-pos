/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderDTO, OrderItemDTO } from './dtos/order.dto';
import {
  CreateOrderDTO,
  CreateOrderItemInputDTO,
} from './dtos/create-order.dto';
import { BaseDTO } from 'src/core/utils/base.dto';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';
import { DeliveryRegion } from '../delivery-region/delivery-region.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { MenuItem } from '../menu-item/menu-item.entity';
import { OrderStatus } from 'src/core/enums/order-status';
import { mapBranchToBranchDtoSelective } from '../branch/branch.mapper';
import {
  assertMoneyEquals,
  calculateItemsSubtotalFromLines,
  resolveMenuItemUnitPrice,
} from 'src/core/utils/order-totals.util';

export { roundMoney } from 'src/core/utils/order-totals.util';

const allowedOrderDtoKeys: ReadonlyArray<keyof OrderDTO | keyof BaseDTO> = [
  'id',
  'branch',
  'orderType',
  'status',
  'orderQueue',
  'itemsSubtotal',
  'deliveryFees',
  'serviceFee',
  'totalAmount',
  'items',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

const allowedOrderItemDtoKeys: ReadonlyArray<
  keyof OrderItemDTO | keyof BaseDTO
> = [
  'id',
  'quantity',
  'unitPrice',
  'menuItemNameAr',
  'menuItemNameEn',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

export function mapOrderItemToOrderItemDtoSelective(
  item: OrderItem,
  keys?: (keyof OrderItemDTO | keyof BaseDTO)[],
): Partial<OrderItemDTO>;
export function mapOrderItemToOrderItemDtoSelective(
  items: OrderItem[],
  keys?: (keyof OrderItemDTO | keyof BaseDTO)[],
): Partial<OrderItemDTO>[];
export function mapOrderItemToOrderItemDtoSelective(
  itemOrItems: OrderItem | OrderItem[],
  keys?: (keyof OrderItemDTO | keyof BaseDTO)[],
): Partial<OrderItemDTO> | Partial<OrderItemDTO>[] {
  const mapSingle = (item: OrderItem): Partial<OrderItemDTO> => {
    const dto: Partial<OrderItemDTO> = {};
    const keysToMap = (keys || allowedOrderItemDtoKeys).filter((key) =>
      allowedOrderItemDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in item && item[key as keyof OrderItem] !== undefined) {
        (dto as any)[key] = item[key as keyof OrderItem];
      }
    });

    return dto;
  };

  return Array.isArray(itemOrItems)
    ? itemOrItems.map(mapSingle)
    : mapSingle(itemOrItems);
}

export function mapOrderToOrderDtoSelective(
  order: Order,
  keys?: (keyof OrderDTO | keyof BaseDTO)[],
): Partial<OrderDTO>;
export function mapOrderToOrderDtoSelective(
  orders: Order[],
  keys?: (keyof OrderDTO | keyof BaseDTO)[],
): Partial<OrderDTO>[];
export function mapOrderToOrderDtoSelective(
  orderOrOrders: Order | Order[],
  keys?: (keyof OrderDTO | keyof BaseDTO)[],
): Partial<OrderDTO> | Partial<OrderDTO>[] {
  const mapSingle = (order: Order): Partial<OrderDTO> => {
    const dto: Partial<OrderDTO> = {};
    const keysToMap = (keys || allowedOrderDtoKeys).filter((key) =>
      allowedOrderDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in order && order[key as keyof Order] !== undefined) {
        (dto as any)[key] = order[key as keyof Order];
      }
      if (key === 'branch' && order.branch) {
        (dto as any)[key] = mapBranchToBranchDtoSelective(order.branch);
      }
      if (key === 'items' && order.items) {
        (dto as any)[key] = mapOrderItemToOrderItemDtoSelective(order.items);
      }
    });

    return dto;
  };

  return Array.isArray(orderOrOrders)
    ? orderOrOrders.map(mapSingle)
    : mapSingle(orderOrOrders);
}

export function mapCreateOrderItemsToEntities(
  items: CreateOrderItemInputDTO[],
  menuItemById: Map<number, MenuItem>,
  priceByMenuItemId: Map<number, number>,
  creator?: string,
): OrderItem[] {
  return items.map((line) => {
    const menuItem = menuItemById.get(line.menuItemId)!;
    const serverUnitPrice = resolveMenuItemUnitPrice(
      line.menuItemId,
      menuItem.defaultPrice,
      priceByMenuItemId,
    );
    assertMoneyEquals(
      line.unitPrice,
      serverUnitPrice,
      `unitPrice for menuItem ${line.menuItemId}`,
    );

    const orderItem = new OrderItem();
    orderItem.menuItem = menuItem;
    orderItem.quantity = line.quantity;
    orderItem.unitPrice = serverUnitPrice;
    orderItem.menuItemNameAr = menuItem.nameAr;
    orderItem.menuItemNameEn = menuItem.nameEn;
    if (creator) {
      orderItem.createdBy = creator;
      orderItem.updatedBy = creator;
    }

    return orderItem;
  });
}

export function calculateItemsSubtotal(
  items: CreateOrderItemInputDTO[],
): number {
  return calculateItemsSubtotalFromLines(items);
}

/** Stepped-kitchen branches start prepared (done); others start pending. */
export function resolveInitialOrderStatus(branch: Branch): OrderStatus {
  return branch.isSteppedKitchen
    ? OrderStatus.PENDING
    : OrderStatus.PREPARED;
}
export type CreateOrderEntityInput = {
  dto: CreateOrderDTO;
  branch: Branch;
  shift: ShiftManagement;
  customer?: User;
  deliveryRegion?: DeliveryRegion;
  orderQueue: number;
  itemsSubtotal: number;
  deliveryFees: number;
  serviceFee: number;
  totalAmount: number;
  orderItems: OrderItem[];
  creator?: string;
};

export function mapCreateOrderToEntity(input: CreateOrderEntityInput): Order {
  const order = new Order();

  order.branch = input.branch;
  order.shift = input.shift;
  order.customer = input.customer;
  order.deliveryRegion = input.deliveryRegion;
  order.orderType = input.dto.orderType;
  order.orderQueue = input.orderQueue;
  order.itemsSubtotal = input.itemsSubtotal;
  order.deliveryFees = input.deliveryFees;
  order.serviceFee = input.serviceFee;
  order.totalAmount = input.totalAmount;
  order.status = resolveInitialOrderStatus(input.branch);
  order.items = input.orderItems;

  if (input.creator) {
    order.createdBy = input.creator;
    order.updatedBy = input.creator;
  }

  return order;
}
