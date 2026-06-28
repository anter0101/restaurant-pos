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

  describe('openShift', () => {
    it('resets branch nextOrderQueue when opening a shift', async () => {
      const branch = { id: 1, nextOrderQueue: 42 };
      branchRepository.findOne.mockResolvedValue(branch);
      userRepository.findOne.mockResolvedValue({
        id: 3,
        role: UserRole.CASHIER,
        branch: { id: 1 },
      });
      shiftRepository.findOne.mockResolvedValue(null);

      await service.openShift({ cashierId: 3 });

      expect(branch.nextOrderQueue).toBe(resetOrderQueueCounter());
      expect(branchRepository.save).toHaveBeenCalledWith(branch);
      expect(shiftRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ShiftStatus.OPEN }),
      );
    });

    it('rejects when cashier already has an open shift', async () => {
      branchRepository.findOne.mockResolvedValue({ id: 1 });
      userRepository.findOne.mockResolvedValue({
        id: 3,
        role: UserRole.CASHIER,
        branch: { id: 1 },
      });
      shiftRepository.findOne.mockResolvedValue({ id: 9, status: ShiftStatus.OPEN });

      await expect(
        service.openShift({ cashierId: 3 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when cashier has no branch', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 3,
        role: UserRole.CASHIER,
        branch: undefined,
      });

      await expect(
        service.openShift({ cashierId: 3 }),
      ).rejects.toThrow(/not assigned to a branch/);
    });

    it('rejects when user is not a cashier', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 3,
        role: UserRole.ADMIN,
        branch: { id: 1 },
      });

      await expect(
        service.openShift({ cashierId: 3 }),
      ).rejects.toThrow(/is not a cashier/);
    });
  });

  describe('endShift', () => {
    it('closes shift, ends prepared orders, and resets branch queue counter', async () => {
      const shift = {
        id: 7,
        status: ShiftStatus.OPEN,
        branch: { id: 2 },
      };
      const preparedOrders = [
        { id: 100, status: OrderStatus.PREPARED },
        { id: 101, status: OrderStatus.PREPARED },
      ];

      const shiftRepo = {
        findOne: jest.fn().mockResolvedValue(shift),
        save: jest.fn(async (s) => s),
      };
      const orderRepo = {
        find: jest.fn().mockResolvedValue(preparedOrders),
        count: jest.fn().mockResolvedValue(2),
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '350.50' }),
        })),
      };
      const branchRepo = {
        update: jest.fn(),
      };

      shiftRepository.manager.transaction.mockImplementation(async (cb) =>
        cb({
          getRepository: jest.fn((entity) => {
            if (entity === ShiftManagement) return shiftRepo;
            if (entity === Order) return orderRepo;
            if (entity === Branch) return branchRepo;
            return {};
          }),
        }),
      );

      const result = await service.endShift(7, { endMoney: 500 });

      expect(result.status).toBe(ShiftStatus.CLOSED);
      expect(result.endMoney).toBe(500);
      expect(result.actualEndMoney).toBe(350.5);
      expect(result.totalOrders).toBe(2);
      expect(orderRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ status: OrderStatus.SHIFT_CALCULATED }),
        expect.objectContaining({ status: OrderStatus.SHIFT_CALCULATED }),
      ]);
      expect(branchRepo.update).toHaveBeenCalledWith(
        { id: 2 },
        { nextOrderQueue: resetOrderQueueCounter() },
      );
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
        service.endShift(999, { endMoney: 0 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('calculateOrdersTotals', () => {
    it('calculates totals, marks shift calculated, and batch-updates prepared orders', async () => {
      const shift = {
        id: 7,
        status: ShiftStatus.CLOSED,
      };

      const shiftRepo = {
        findOne: jest.fn().mockResolvedValue(shift),
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

      expect(result).toBe(350.5);
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
});
