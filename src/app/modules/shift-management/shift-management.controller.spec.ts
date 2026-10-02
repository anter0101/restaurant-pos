import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShiftManagementController } from './shift-management.controller';
import { ShiftManagementService } from './shift-management.service';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { AuthService } from '../auth/auth.service';
import { UserRole } from 'src/core/enums/user-role';

describe('ShiftManagementController', () => {
  let controller: ShiftManagementController;
  let shiftService: {
    openShift: jest.Mock;
    endShift: jest.Mock;
    findById: jest.Mock;
    findAndCount: jest.Mock;
    closeShiftById: jest.Mock;
    calculateOrdersTotals: jest.Mock;
  };
  let authService: { validateCredentials: jest.Mock };

  beforeEach(async () => {
    shiftService = {
      openShift: jest.fn(),
      endShift: jest.fn(),
      findById: jest.fn(),
      findAndCount: jest.fn(),
      closeShiftById: jest.fn(),
      calculateOrdersTotals: jest.fn(),
    };
    authService = { validateCredentials: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftManagementController],
      providers: [
        { provide: ShiftManagementService, useValue: shiftService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get(ShiftManagementController);
  });

  it('openShift delegates to service after manager credential check', async () => {
    const shift = { id: 1, status: ShiftStatus.OPEN };
    const cashier = {
      id: 2,
      username: 'cashier1',
      role: UserRole.CASHIER,
      branch: { id: 1 },
    };
    const manager = {
      id: 5,
      username: 'manager1',
      role: UserRole.MANAGER,
      branch: { id: 1 },
    };
    shiftService.openShift.mockResolvedValue(shift);
    authService.validateCredentials.mockResolvedValue(manager);

    const result = await controller.openShift(
      { username: 'manager1', password: 'secret' },
      cashier as any,
    );

    expect(authService.validateCredentials).toHaveBeenCalledWith(
      'manager1',
      'secret',
    );
    expect(shiftService.openShift).toHaveBeenCalledWith(cashier, manager);
    expect(result).toEqual(shift);
  });

  it('endShift delegates to service after manager credential check', async () => {
    const shift = { id: 1, status: ShiftStatus.CLOSED };
    const cashier = { id: 2, branch: { id: 1 }, role: UserRole.CASHIER };
    const manager = { id: 5, role: UserRole.MANAGER, branch: { id: 1 } };
    shiftService.endShift.mockResolvedValue(shift);
    authService.validateCredentials.mockResolvedValue(manager);

    const result = await controller.endShift(
      cashier as any,
      { username: 'manager1', password: 'secret' },
    );

    expect(authService.validateCredentials).toHaveBeenCalledWith(
      'manager1',
      'secret',
    );
    expect(shiftService.endShift).toHaveBeenCalledWith(cashier, manager);
    expect(result).toEqual(shift);
  });

  it('getAllShifts delegates to service', async () => {
    shiftService.findAndCount.mockResolvedValue([
      [{ id: 1, status: ShiftStatus.OPEN, branch: { id: 1 }, cashier: { id: 2, name: 'C' } }],
      1,
    ]);
    const req = { res: { set: jest.fn() } } as any;

    const result = await controller.getAllShifts(
      req,
      { page: 1, pageSize: 10 },
      { id: 1, role: 'ADMIN', branch: { id: 1 } } as any,
    );

    expect(shiftService.findAndCount).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('getById throws when shift missing', async () => {
    shiftService.findById.mockResolvedValue(undefined);

    await expect(
      controller.getById(404, { id: 1, role: UserRole.ADMIN } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getById hides other-branch shifts from manager', async () => {
    shiftService.findById.mockResolvedValue({
      id: 3,
      branch: { id: 9 },
      cashier: { id: 2 },
    });

    await expect(
      controller.getById(3, {
        id: 5,
        role: UserRole.MANAGER,
        branch: { id: 1 },
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('closeShift delegates to service', async () => {
    const closed = {
      id: 1,
      status: ShiftStatus.CLOSED,
      branch: { id: 1 },
      cashier: { id: 2, name: 'C' },
    };
    shiftService.closeShiftById.mockResolvedValue(closed);
    const manager = {
      id: 5,
      role: UserRole.MANAGER,
      branch: { id: 1 },
      username: 'manager1',
    };

    const result = await controller.closeShift(
      1,
      { endMoney: 100 },
      manager as any,
    );

    expect(shiftService.closeShiftById).toHaveBeenCalledWith(1, manager, 100);
    expect(result.status).toBe(ShiftStatus.CLOSED);
  });

  it('calculateOrdersTotals returns mapped shift DTO', async () => {
    shiftService.calculateOrdersTotals.mockResolvedValue({
      id: 1,
      status: ShiftStatus.CALCULATED,
      actualEndMoney: 350.5,
      totalOrders: 2,
      branch: { id: 1, name: 'Main' },
      cashier: { id: 2, name: 'C' },
    });

    const result = await controller.calculateOrdersTotals(1, {
      id: 1,
      role: UserRole.ADMIN,
      username: 'admin',
    } as any);

    expect(shiftService.calculateOrdersTotals).toHaveBeenCalledWith(1, 'admin');
    expect(result.totalOrders).toBe(2);
    expect(result.actualEndMoney).toBe(350.5);
  });
});
