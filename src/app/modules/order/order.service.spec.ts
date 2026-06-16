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

describe('OrderService', () => {
  let service: OrderService;
  let transactionFn: jest.Mock;

  const branchEntity = {
    id: 1,
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

  beforeEach(async () => {
    transactionFn = jest.fn();

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
      service.createOrder({ branchId: 1, items: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
      orderItem: {
        create: jest.fn((item) => item),
      },
      order: {
        create: jest.fn((order) => order),
        save: orderSave,
      },
    });

    const result = await service.createOrder({
      branchId: 1,
      items: [{ menuItemId: 10, quantity: 2 }],
    });

    expect(result.orderQueue).toBe(5);
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
      orderItem: {
        create: jest.fn((item) => item),
      },
      order: {
        create: jest.fn((order) => order),
        save: jest.fn().mockImplementation(async (order) => order),
      },
    });

    const result = await service.createOrder({
      branchId: 1,
      items: [{ menuItemId: 10, quantity: 1 }],
    });

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
      service.createOrder({
        branchId: 999,
        items: [{ menuItemId: 10, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
