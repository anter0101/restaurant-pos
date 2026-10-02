import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShiftManagementService } from './shift-management.service';
import { ShiftManagement } from './shift-management.entity';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { UserRole } from 'src/core/enums/user-role';
import { OrderStatus } from 'src/core/enums/order-status';
import { resetOrderQueueCounter } from 'src/core/utils/order-queue.util';

describe('ShiftManagementService', () => {
  let service: ShiftManagementService;
  let shiftRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let branchRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };

  const manager = {
    id: 5,
    role: UserRole.MANAGER,
    branch: { id: 1 },
  } as User;

  const cashier = {
    id: 3,
    role: UserRole.CASHIER,
    branch: { id: 1 },
  } as User;

  beforeEach(async () => {
    shiftRepository = {
      findOne: jest.fn(),
      create: jest.fn((shift) => shift),
      save: jest.fn(async (shift) => ({ id: 1, ...shift })),
      manager: { transaction: jest.fn() },
    };
    branchRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    userRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftManagementService,
        {
          provide: getRepositoryToken(ShiftManagement),
          useValue: shiftRepository,
        },
        { provide: getRepositoryToken(Branch), useValue: branchRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = module.get(ShiftManagementService);
  });

  function mockUsers(
    managerUser: Partial<User> = manager,
    cashierUser: Partial<User> = cashier,
  ) {
    userRepository.findOne.mockImplementation(async (opts: { where: { id: number } }) => {
      if (opts.where.id === manager.id) {
        return { ...manager, ...managerUser };
      }
      if (opts.where.id === cashier.id) {
        return { ...cashier, ...cashierUser };
      }
      return null;
    });
  }

  describe('openShift', () => {
    it('resets branch nextOrderQueue when opening a shift', async () => {
      const branch = { id: 1, nextOrderQueue: 42 };
      mockUsers();
      userRepository.findOne.mockImplementation(async (opts: { where: { id: number } }) => {
        if (opts.where.id === manager.id) {
          return { ...manager, branch };
        }
        if (opts.where.id === cashier.id) {
          return { ...cashier, branch };
        }
        return null;
      });
      shiftRepository.findOne.mockResolvedValue(null);

      await service.openShift(cashier, manager);

      expect(branch.nextOrderQueue).toBe(resetOrderQueueCounter());
      expect(branchRepository.save).toHaveBeenCalledWith(branch);
      expect(shiftRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ShiftStatus.OPEN }),
      );
    });

    it('rejects when cashier already has an open shift', async () => {
      mockUsers();
      shiftRepository.findOne.mockResolvedValue({ id: 9, status: ShiftStatus.OPEN });

      await expect(service.openShift(cashier, manager)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects when cashier has no branch', async () => {
      mockUsers(manager, { ...cashier, branch: undefined });

      await expect(service.openShift(cashier, manager)).rejects.toThrow(
        /not assigned to a branch/,
      );
    });

    it('rejects when user is not a cashier', async () => {
      mockUsers(manager, { ...cashier, role: UserRole.ADMIN });

      await expect(service.openShift(cashier, manager)).rejects.toThrow(
        /is not a cashier/,
      );
    });

    it('rejects when manager is not a manager', async () => {
      mockUsers({ ...manager, role: UserRole.ADMIN });

      await expect(service.openShift(cashier, manager)).rejects.toThrow(
        /is not a manager/,
      );
    });
  });

  describe('endShift', () => {
    it('closes the cashier open shift', async () => {
      const shift = {
        id: 7,
        status: ShiftStatus.OPEN,
        branch: { id: 1 },
        cashier: { id: 3 },
      };
      mockUsers();
      shiftRepository.findOne.mockResolvedValue(shift);
      shiftRepository.save.mockImplementation(async (s) => s);

      const result = await service.endShift(cashier, manager);

      expect(result.status).toBe(ShiftStatus.CLOSED);
      expect(result.endShift).toBeInstanceOf(Date);
    });

    it('throws when cashier has no open shift', async () => {
      mockUsers();
      shiftRepository.findOne.mockResolvedValue(null);

      await expect(service.endShift(cashier, manager)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('calculateOrdersTotals', () => {
    it('calculates totals, marks shift calculated, and batch-updates prepared orders', async () => {
      const shift = {
        id: 7,
        status: ShiftStatus.CLOSED,
      };

      const shiftRepo = {
        findOne: jest.fn()
          .mockResolvedValueOnce(shift)
          .mockResolvedValueOnce({
            ...shift,
            status: ShiftStatus.CALCULATED,
            actualEndMoney: 350.5,
            totalOrders: 2,
            branch: { id: 1 },
            cashier: { id: 3 },
          }),
        save: jest.fn(async (s) => s),
      };
      const orderRepo = {
        createQueryBuilder: jest.fn((alias?: string) => {
          if (alias === 'order') {
            return {
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: '350.50', count: '2' }),
            };
          }
          return {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 2 }),
          };
        }),
      };

      shiftRepository.manager.transaction.mockImplementation(async (cb) =>
        cb({
          getRepository: jest.fn((entity) => {
            if (entity === ShiftManagement) return shiftRepo;
            if (entity === Order) return orderRepo;
            return {};
          }),
        }),
      );

      const result = await service.calculateOrdersTotals(7, 'admin');

      expect(result.actualEndMoney).toBe(350.5);
      expect(result.totalOrders).toBe(2);
      expect(result.status).toBe(ShiftStatus.CALCULATED);
      expect(shift.status).toBe(ShiftStatus.CALCULATED);
      expect(shift.actualEndMoney).toBe(350.5);
      expect(shift.totalOrders).toBe(2);
      expect(shift.updatedBy).toBe('admin');
      expect(orderRepo.createQueryBuilder).toHaveBeenCalledWith('order');
      expect(orderRepo.createQueryBuilder).toHaveBeenCalledWith();
    });

    it('throws when shift is not found', async () => {
      shiftRepository.manager.transaction.mockImplementation(async (cb) =>
        cb({
          getRepository: jest.fn(() => ({
            findOne: jest.fn().mockResolvedValue(null),
          })),
        }),
      );

      await expect(
        service.calculateOrdersTotals(999),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when shift is already calculated', async () => {
      shiftRepository.manager.transaction.mockImplementation(async (cb) =>
        cb({
          getRepository: jest.fn(() => ({
            findOne: jest.fn().mockResolvedValue({
              id: 7,
              status: ShiftStatus.CALCULATED,
            }),
          })),
        }),
      );

      await expect(
        service.calculateOrdersTotals(7),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when shift is still open', async () => {
      shiftRepository.manager.transaction.mockImplementation(async (cb) =>
        cb({
          getRepository: jest.fn(() => ({
            findOne: jest.fn().mockResolvedValue({
              id: 7,
              status: ShiftStatus.OPEN,
            }),
          })),
        }),
      );

      await expect(
        service.calculateOrdersTotals(7),
      ).rejects.toThrow(/must be closed/);
    });
  });

  describe('closeShiftById', () => {
    const admin = {
      id: 1,
      role: UserRole.ADMIN,
      username: 'admin',
    } as User;
    const managerUser = {
      id: 5,
      role: UserRole.MANAGER,
      username: 'manager1',
      branch: { id: 1 },
    } as User;

    function mockCloseTxn(shift: Record<string, unknown> | null) {
      const shiftRepo = {
        findOne: jest.fn().mockResolvedValue(shift),
        save: jest.fn(async (s) => s),
      };
      shiftRepository.manager.transaction.mockImplementation(async (cb) =>
        cb({
          getRepository: jest.fn(() => shiftRepo),
        }),
      );
      return shiftRepo;
    }

    it('closes an OPEN shift and stores endMoney', async () => {
      const shift = {
        id: 7,
        status: ShiftStatus.OPEN,
        branch: { id: 1 },
        cashier: { id: 3 },
      };
      mockCloseTxn(shift);

      const result = await service.closeShiftById(7, admin, 99.5);

      expect(result.status).toBe(ShiftStatus.CLOSED);
      expect(result.endMoney).toBe(99.5);
      expect(result.endShift).toBeInstanceOf(Date);
      expect(result.updatedBy).toBe('admin');
    });

    it('forbids a manager from closing another branch shift', async () => {
      mockCloseTxn({
        id: 7,
        status: ShiftStatus.OPEN,
        branch: { id: 9 },
      });

      await expect(
        service.closeShiftById(7, managerUser),
      ).rejects.toThrow(/another branch/);
    });

    it('rejects closing a shift that is not OPEN', async () => {
      mockCloseTxn({
        id: 7,
        status: ShiftStatus.CLOSED,
        branch: { id: 1 },
      });

      await expect(service.closeShiftById(7, admin)).rejects.toThrow(
        /Only OPEN shifts/,
      );
    });
  });
});
