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
  };
  let authService: { validateCredentials: jest.Mock };

  beforeEach(async () => {
    shiftService = {
      openShift: jest.fn(),
      endShift: jest.fn(),
      findById: jest.fn(),
      findAndCount: jest.fn(),
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

    await expect(controller.getById(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
