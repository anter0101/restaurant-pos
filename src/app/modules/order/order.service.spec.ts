import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { Order } from './order.entity';
import { Branch } from '../branch/branch.entity';
import { MenuItem } from '../menu-item/menu-item.entity';
import { RelMenuBranch } from '../menu-item/rel-menu-branch.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { BranchType } from 'src/core/enums/branch-type';
import { ShiftManagementService } from '../shift-management/shift-management.service';
import { User } from '../user/user.entity';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { CreateOrderDTO } from './dtos/create-order.dto';

describe('OrderService', () => {
  let service: OrderService;
  let transactionFn: jest.Mock;
  let findOpenShiftForCashier: jest.Mock;

  const branchEntity = {
    id: 1,
    type: BranchType.DINE_IN,
    nextOrderQueue: 5,
    servicePercentage: 0.1,
  };

  const menuItem = {
    id: 10,
    defaultPrice: 20,
    nameAr: 'برجر',
    nameEn: 'Burger',
    isActive: true,
  };

  const cashierUser = {
    id: 2,
    username: 'cashier',
    branch: { id: 1 },
  } as User;

  const openShift = {
    id: 10,
    status: ShiftStatus.OPEN,
    branch: { id: 1 },
    cashier: { id: 2 },
  };

  function buildOrderDto(
    overrides: Partial<CreateOrderDTO> = {},
  ): CreateOrderDTO {
    const orderType = overrides.orderType ?? OrderType.DINE_IN;
    const items = overrides.items ?? [
      { menuItemId: 10, quantity: 2, unitPrice: 20 },
    ];
    const itemsSubtotal =
      overrides.itemsSubtotal ??
      items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const deliveryFees = overrides.deliveryFees ?? 0;
    const serviceFee =
      overrides.serviceFee ??
      (orderType === OrderType.DINE_IN
        ? Math.round(itemsSubtotal * branchEntity.servicePercentage * 100) / 100
        : 0);
    const totalAmount =
      overrides.totalAmount ?? itemsSubtotal + deliveryFees + serviceFee;

    return {
      orderType,
      items,
      itemsSubtotal,
      deliveryFees,
      serviceFee,
      totalAmount,
      ...overrides,
    };
  }

  beforeEach(async () => {
    transactionFn = jest.fn();
    findOpenShiftForCashier = jest.fn().mockResolvedValue(openShift);

    const orderRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      manager: {
        transaction: transactionFn,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        {
          provide: ShiftManagementService,
          useValue: { findOpenShiftForCashier },
        },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  function mockTransaction(repos: Record<string, unknown>) {
    transactionFn.mockImplementation(async (cb) => {
      const manager = {
        getRepository: jest.fn((entity) => {
          const key =
            entity === Branch
              ? 'branch'
              : entity === Order
                ? 'order'
                : entity === OrderItem
                  ? 'orderItem'
                  : entity === MenuItem
                    ? 'menuItem'
                    : entity === RelMenuBranch
                      ? 'relMenuBranch'
                      : 'default';
          return repos[key] ?? { findOne: jest.fn(), find: jest.fn() };
        }),
      };
      return cb(manager);
    });
  }

  it('rejects create when items array is empty', async () => {
    await expect(
      service.createOrder(
        buildOrderDto({ items: [] as CreateOrderDTO['items'] }),
        cashierUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects create when user has no branch', async () => {
    await expect(
      service.createOrder(buildOrderDto(), { id: 2, username: 'cashier' } as User),
    ).rejects.toThrow(/not assigned to a branch/);
  });

  it('rejects create when user has no open shift', async () => {
    findOpenShiftForCashier.mockResolvedValue(undefined);

    await expect(
      service.createOrder(buildOrderDto(), cashierUser),
    ).rejects.toThrow(/No open shift found/);
  });

  it('rejects when client totalAmount does not match server calculation', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({ ...branchEntity }),
        save: jest.fn(),
      },
      menuItem: { find: jest.fn().mockResolvedValue([menuItem]) },
      relMenuBranch: { find: jest.fn().mockResolvedValue([]) },
    });

    await expect(
      service.createOrder(
        buildOrderDto({ totalAmount: 999 }),
        cashierUser,
      ),
    ).rejects.toThrow(/totalAmount mismatch/);
  });

  it('rejects when client unitPrice does not match menu price', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({ ...branchEntity }),
        save: jest.fn(),
      },
      menuItem: { find: jest.fn().mockResolvedValue([menuItem]) },
      relMenuBranch: { find: jest.fn().mockResolvedValue([]) },
    });

    await expect(
      service.createOrder(
        buildOrderDto({
          items: [{ menuItemId: 10, quantity: 2, unitPrice: 15 }],
          itemsSubtotal: 30,
          serviceFee: 3,
          totalAmount: 33,
        }),
        cashierUser,
      ),
    ).rejects.toThrow(/unitPrice for menuItem 10 mismatch/);
  });

  it('assigns orderQueue from branch counter and advances nextOrderQueue', async () => {
    const branchSave = jest.fn().mockResolvedValue(undefined);
    const orderSave = jest.fn().mockImplementation(async (order) => ({
      id: 99,
      ...order,
    }));

    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({ ...branchEntity }),
        save: branchSave,
      },
      menuItem: {
        find: jest.fn().mockResolvedValue([menuItem]),
      },
      relMenuBranch: {
        find: jest.fn().mockResolvedValue([]),
      },
      order: {
        save: orderSave,
      },
    });

    const result = await service.createOrder(buildOrderDto(), cashierUser);

    expect(result.orderQueue).toBe(5);
    expect(result.orderType).toBe(OrderType.DINE_IN);
    expect(result.shift?.id).toBe(10);
    expect(branchSave).toHaveBeenCalledWith(
      expect.objectContaining({ nextOrderQueue: 6 }),
    );
    expect(result.status).toBe(OrderStatus.PENDING);
    expect(result.itemsSubtotal).toBe(40);
    expect(result.serviceFee).toBe(4);
    expect(result.totalAmount).toBe(44);
  });

  it('wraps queue at 100 back to 0 on branch counter', async () => {
    const branchSave = jest.fn().mockResolvedValue(undefined);

    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({
          ...branchEntity,
          nextOrderQueue: 100,
        }),
        save: branchSave,
      },
      menuItem: {
        find: jest.fn().mockResolvedValue([menuItem]),
      },
      relMenuBranch: {
        find: jest.fn().mockResolvedValue([]),
      },
      order: {
        save: jest.fn().mockImplementation(async (order) => order),
      },
    });

    const result = await service.createOrder(
      buildOrderDto({
        orderType: OrderType.TAKEAWAY,
        items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
        itemsSubtotal: 20,
        serviceFee: 0,
        totalAmount: 20,
      }),
      cashierUser,
    );

    expect(result.orderQueue).toBe(100);
    expect(branchSave).toHaveBeenCalledWith(
      expect.objectContaining({ nextOrderQueue: 0 }),
    );
  });

  it('throws when branch is not found', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.createOrder(
        buildOrderDto({
          items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          serviceFee: 2,
          totalAmount: 22,
        }),
        { ...cashierUser, branch: { id: 999 } as Branch },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects DINE_IN order on TAKEAWAY branch', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({
          ...branchEntity,
          type: BranchType.TAKEAWAY,
        }),
      },
    });

    await expect(
      service.createOrder(
        buildOrderDto({
          items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          serviceFee: 2,
          totalAmount: 22,
        }),
        cashierUser,
      ),
    ).rejects.toThrow(/cannot accept DINE_IN orders/);
  });

  it('allows TAKEAWAY on TAKEAWAY branch', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({
          ...branchEntity,
          type: BranchType.TAKEAWAY,
          servicePercentage: 0,
        }),
        save: jest.fn(),
      },
      menuItem: { find: jest.fn().mockResolvedValue([menuItem]) },
      relMenuBranch: { find: jest.fn().mockResolvedValue([]) },
      order: {
        save: jest.fn().mockImplementation(async (order) => order),
      },
    });

    const takeaway = await service.createOrder(
      buildOrderDto({
        orderType: OrderType.TAKEAWAY,
        items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
        itemsSubtotal: 20,
        serviceFee: 0,
        totalAmount: 20,
      }),
      cashierUser,
    );
    expect(takeaway.orderType).toBe(OrderType.TAKEAWAY);
  });

  it('sets deliveryFees to 0 for TAKEAWAY order type', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({ ...branchEntity, servicePercentage: 0 }),
        save: jest.fn(),
      },
      menuItem: { find: jest.fn().mockResolvedValue([menuItem]) },
      relMenuBranch: { find: jest.fn().mockResolvedValue([]) },
      order: {
        save: jest.fn().mockImplementation(async (order) => order),
      },
    });

    const result = await service.createOrder(
      buildOrderDto({
        orderType: OrderType.TAKEAWAY,
        items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
        itemsSubtotal: 20,
        serviceFee: 0,
        totalAmount: 20,
      }),
      cashierUser,
    );

    expect(result.deliveryFees).toBe(0);
    expect(result.serviceFee).toBe(0);
    expect(result.totalAmount).toBe(20);
  });

  it('requires deliveryRegionId for DELIVERY order type', async () => {
    await expect(
      service.createOrder(
        buildOrderDto({
          orderType: OrderType.DELIVERY,
          items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          deliveryFees: 0,
          serviceFee: 0,
          totalAmount: 20,
        }),
        cashierUser,
      ),
    ).rejects.toThrow(/deliveryRegionId is required/);
  });

  it('snapshots deliveryFees for DELIVERY order type', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({ ...branchEntity, servicePercentage: 0.1 }),
        save: jest.fn(),
      },
      default: {
        findOne: jest.fn().mockImplementation(({ where }) => {
          if (where?.id === 2) {
            return Promise.resolve({ id: 2, deliveryPrice: 5, regionName: 'North' });
          }
          return Promise.resolve(null);
        }),
      },
      menuItem: { find: jest.fn().mockResolvedValue([menuItem]) },
      relMenuBranch: { find: jest.fn().mockResolvedValue([]) },
      order: {
        save: jest.fn().mockImplementation(async (order) => order),
      },
    });

    const result = await service.createOrder(
      buildOrderDto({
        orderType: OrderType.DELIVERY,
        deliveryRegionId: 2,
        items: [{ menuItemId: 10, quantity: 2, unitPrice: 20 }],
        itemsSubtotal: 40,
        deliveryFees: 5,
        serviceFee: 0,
        totalAmount: 45,
      }),
      cashierUser,
    );

    expect(result.orderType).toBe(OrderType.DELIVERY);
    expect(result.deliveryFees).toBe(5);
    expect(result.serviceFee).toBe(0);
    expect(result.totalAmount).toBe(45);
  });

  it('does not apply service fee for TAKEAWAY orders', async () => {
    mockTransaction({
      branch: {
        findOne: jest.fn().mockResolvedValue({ ...branchEntity, servicePercentage: 0.1 }),
        save: jest.fn(),
      },
      menuItem: { find: jest.fn().mockResolvedValue([menuItem]) },
      relMenuBranch: { find: jest.fn().mockResolvedValue([]) },
      order: {
        save: jest.fn().mockImplementation(async (order) => order),
      },
    });

    const result = await service.createOrder(
      buildOrderDto({
        orderType: OrderType.TAKEAWAY,
        items: [{ menuItemId: 10, quantity: 2, unitPrice: 20 }],
        itemsSubtotal: 40,
        serviceFee: 0,
        totalAmount: 40,
      }),
      cashierUser,
    );

    expect(result.serviceFee).toBe(0);
    expect(result.totalAmount).toBe(40);
  });
});
