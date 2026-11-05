import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { Order } from '../order/order.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { Branch } from '../branch/branch.entity';
import { UserRole } from 'src/core/enums/user-role';
import { User } from '../user/user.entity';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { ShiftStatus } from 'src/core/enums/shift-status';

function queryBuilder(rawMany: unknown[] = [], rawOne: unknown = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawMany),
    getRawOne: jest.fn().mockResolvedValue(rawOne),
  };
}

describe('StatisticsService', () => {
  let service: StatisticsService;
  let orderRepository: { createQueryBuilder: jest.Mock; find: jest.Mock };
  let shiftRepository: {
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let branchRepository: { findOne: jest.Mock };

  const admin = { id: 1, role: UserRole.ADMIN, username: 'admin' } as User;
  const manager = {
    id: 5,
    role: UserRole.MANAGER,
    username: 'manager1',
    branch: { id: 1, name: 'Downtown' },
  } as User;

  beforeEach(async () => {
    orderRepository = {
      createQueryBuilder: jest.fn(() =>
        queryBuilder([], {
          itemsSubtotal: '0',
          deliveryFees: '0',
          serviceFees: '0',
        }),
      ),
      find: jest.fn(),
    };
    shiftRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder([])),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    branchRepository = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        {
          provide: getRepositoryToken(ShiftManagement),
          useValue: shiftRepository,
        },
        { provide: getRepositoryToken(Branch), useValue: branchRepository },
      ],
    }).compile();

    service = module.get(StatisticsService);
  });

  it('returns zeroed KPIs when the range is empty', async () => {
    const result = await service.getDashboard(admin, {
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-02T00:00:00.000Z',
    });

    expect(result.kpis.orderCount).toBe(0);
    expect(result.kpis.revenue).toBe(0);
    expect(result.branches).toEqual([]);
    expect(result.scope.branchId).toBeNull();
  });

  it('locks manager dashboard to their branch', async () => {
    branchRepository.findOne.mockResolvedValue({ id: 1, name: 'Downtown' });

    const result = await service.getDashboard(manager, {
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-02T00:00:00.000Z',
    });

    expect(result.scope.branchId).toBe(1);
  });

  it('forbids manager from requesting another branch', async () => {
    await expect(
      service.getDashboard(manager, {
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-02T00:00:00.000Z',
        branchId: 99,
      }),
    ).rejects.toThrow(/another branch/);
  });

  it('aggregates revenue only from prepared and shift-calculated orders', async () => {
    orderRepository.createQueryBuilder.mockImplementation(() =>
      queryBuilder(
        [
          {
            status: OrderStatus.PREPARED,
            count: '2',
            revenue: '40',
            itemsSubtotal: '36',
            deliveryFees: '2',
            serviceFees: '2',
          },
          {
            status: OrderStatus.PENDING,
            count: '1',
            revenue: '10',
            itemsSubtotal: '10',
            deliveryFees: '0',
            serviceFees: '0',
          },
          {
            status: OrderStatus.SHIFT_CALCULATED,
            count: '1',
            revenue: '20',
            itemsSubtotal: '20',
            deliveryFees: '0',
            serviceFees: '0',
          },
        ],
        { itemsSubtotal: '56', deliveryFees: '2', serviceFees: '2' },
      ),
    );

    const result = await service.getDashboard(admin, {
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-02T00:00:00.000Z',
    });

    expect(result.kpis.orderCount).toBe(3);
    expect(result.kpis.revenue).toBe(60);
    expect(result.kpis.pendingCount).toBe(1);
    expect(result.kpis.averageOrderValue).toBe(20);
  });

  it('printShiftOrders 404s when the shift is missing', async () => {
    shiftRepository.findOne.mockResolvedValue(null);

    await expect(
      service.printShiftOrders(admin, { shiftId: 9 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('printShiftOrders forbids a manager on another branch', async () => {
    shiftRepository.findOne.mockResolvedValue({
      id: 3,
      branch: { id: 9, name: 'Other' },
      cashier: { name: 'Ali' },
      startShift: new Date('2026-10-01T08:00:00.000Z'),
      status: ShiftStatus.OPEN,
    });

    await expect(
      service.printShiftOrders(manager, { shiftId: 3 }),
    ).rejects.toThrow(/another branch/);
  });

  it('printBranchKpis requires branchId for admin', async () => {
    await expect(
      service.printBranchKpis(admin, {
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-02T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('printShiftOrders lists all statuses and footers revenue statuses only', async () => {
    shiftRepository.findOne.mockResolvedValue({
      id: 3,
      status: ShiftStatus.CLOSED,
      startShift: new Date('2026-10-01T08:00:00.000Z'),
      endShift: new Date('2026-10-01T16:00:00.000Z'),
      branch: { id: 1, name: 'Downtown', address: 'A', phone: '1' },
      cashier: { name: 'Ali' },
      endMoney: 100,
      actualEndMoney: 80,
      totalOrders: 1,
    });
    orderRepository.find.mockResolvedValue([
      {
        id: 1,
        orderQueue: 0,
        orderType: OrderType.DINE_IN,
        status: OrderStatus.PREPARED,
        createdAt: new Date(),
        itemsSubtotal: 20,
        deliveryFees: 0,
        serviceFee: 0,
        totalAmount: 20,
        items: [
          {
            menuItemNameAr: 'قهوة',
            menuItemNameEn: 'Coffee',
            quantity: 2,
            unitPrice: 10,
          },
        ],
      },
      {
        id: 2,
        orderQueue: 1,
        orderType: OrderType.TAKEAWAY,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        itemsSubtotal: 5,
        deliveryFees: 0,
        serviceFee: 0,
        totalAmount: 5,
        items: [],
      },
    ]);

    const result = await service.printShiftOrders(manager, { shiftId: 3 });

    expect(result.kind).toBe('SHIFT_ORDERS');
    expect(result.sections?.orders).toHaveLength(2);
    expect(result.footer.orderCount).toBe(1);
    expect(result.footer.revenue).toBe(20);
  });
});
