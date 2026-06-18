import {
  calculateItemsSubtotal,
  mapCreateOrderItemsToEntities,
  mapCreateOrderToEntity,
  mapOrderToOrderDtoSelective,
  resolveInitialOrderStatus,
  roundMoney,
} from './order.mapper';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { MenuItem } from '../menu-item/menu-item.entity';
import { Branch } from '../branch/branch.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { OrderType } from 'src/core/enums/order-type';
import { OrderStatus } from 'src/core/enums/order-status';
import { BranchType } from 'src/core/enums/branch-type';

describe('order.mapper', () => {
  const menuItem = Object.assign(new MenuItem(), {
    id: 10,
    nameAr: 'برجر',
    nameEn: 'Burger',
    defaultPrice: 20,
  });

  it('roundMoney rounds to two decimals', () => {
    expect(roundMoney(10.555)).toBe(10.56);
  });

  it('mapCreateOrderItemsToEntities snapshots menu names and validates unit price', () => {
    const items = mapCreateOrderItemsToEntities(
      [{ menuItemId: 10, quantity: 2, unitPrice: 18 }],
      new Map([[10, menuItem]]),
      new Map([[10, 18]]),
      'cashier',
    );

    expect(items).toHaveLength(1);
    expect(items[0].unitPrice).toBe(18);
    expect(items[0].menuItemNameEn).toBe('Burger');
    expect(items[0].createdBy).toBe('cashier');
  });

  it('mapCreateOrderItemsToEntities rejects wrong client unit price', () => {
    expect(() =>
      mapCreateOrderItemsToEntities(
        [{ menuItemId: 10, quantity: 2, unitPrice: 99 }],
        new Map([[10, menuItem]]),
        new Map([[10, 18]]),
      ),
    ).toThrow(/unitPrice for menuItem 10 mismatch/);
  });

  it('calculateItemsSubtotal sums line totals from DTO', () => {
    expect(
      calculateItemsSubtotal([{ menuItemId: 10, quantity: 2, unitPrice: 20 }]),
    ).toBe(40);
  });

  it('resolveInitialOrderStatus returns pending unless branch uses stepped kitchen', () => {
    expect(
      resolveInitialOrderStatus(
        Object.assign(new Branch(), { isSteppedKitchen: false }),
      ),
    ).toBe(OrderStatus.PENDING);
    expect(
      resolveInitialOrderStatus(
        Object.assign(new Branch(), { isSteppedKitchen: true }),
      ),
    ).toBe(OrderStatus.PREPARED);
  });

  it('mapCreateOrderToEntity maps resolved context', () => {
    const branch = Object.assign(new Branch(), {
      id: 1,
      type: BranchType.DINE_IN,
      isSteppedKitchen: false,
    });
    const shift = Object.assign(new ShiftManagement(), { id: 5 });
    const orderItems = mapCreateOrderItemsToEntities(
      [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
      new Map([[10, menuItem]]),
      new Map(),
    );

    const order = mapCreateOrderToEntity({
      dto: {
        orderType: OrderType.DINE_IN,
        items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
        itemsSubtotal: 20,
        deliveryFees: 0,
        serviceFee: 2,
        totalAmount: 22,
      },
      branch,
      shift,
      orderQueue: 3,
      itemsSubtotal: 20,
      deliveryFees: 0,
      serviceFee: 2,
      totalAmount: 22,
      orderItems,
      creator: 'cashier',
    });

    expect(order.orderQueue).toBe(3);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.shift.id).toBe(5);
    expect(order.items).toHaveLength(1);
  });

  it('mapCreateOrderToEntity starts prepared for stepped-kitchen branches', () => {
    const branch = Object.assign(new Branch(), {
      id: 1,
      type: BranchType.DINE_IN,
      isSteppedKitchen: true,
    });
    const shift = Object.assign(new ShiftManagement(), { id: 5 });
    const orderItems = mapCreateOrderItemsToEntities(
      [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
      new Map([[10, menuItem]]),
      new Map(),
    );

    const order = mapCreateOrderToEntity({
      dto: {
        orderType: OrderType.DINE_IN,
        items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
        itemsSubtotal: 20,
        deliveryFees: 0,
        serviceFee: 0,
        totalAmount: 20,
      },
      branch,
      shift,
      orderQueue: 1,
      itemsSubtotal: 20,
      deliveryFees: 0,
      serviceFee: 0,
      totalAmount: 20,
      orderItems,
    });

    expect(order.status).toBe(OrderStatus.PREPARED);
  });

  it('mapOrderToOrderDtoSelective projects order fields', () => {
    const order = Object.assign(new Order(), {
      id: 1,
      orderType: OrderType.TAKEAWAY,
      orderQueue: 0,
      itemsSubtotal: 20,
      deliveryFees: 0,
      serviceFee: 0,
      totalAmount: 20,
      status: OrderStatus.PENDING,
      branch: Object.assign(new Branch(), {
        id: 1,
        name: 'Main',
        type: BranchType.DINE_IN,
        address: 'Street',
        servicePercentage: 0.1,
      }),
      items: [
        Object.assign(new OrderItem(), {
          id: 1,
          quantity: 1,
          unitPrice: 20,
          menuItemNameAr: 'برجر',
          menuItemNameEn: 'Burger',
        }),
      ],
    });

    const dto = mapOrderToOrderDtoSelective(order);

    expect(dto.id).toBe(1);
    expect(dto.branch?.name).toBe('Main');
    expect(dto.items).toHaveLength(1);
  });
});
