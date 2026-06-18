import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShiftManagementController } from './shift-management.controller';
import { ShiftManagementService } from './shift-management.service';
import { ShiftStatus } from 'src/core/enums/shift-status';

describe('ShiftManagementController', () => {
  let controller: ShiftManagementController;
  let shiftService: {
    openShift: jest.Mock;
    endShift: jest.Mock;
    findById: jest.Mock;
    findAndCount: jest.Mock;
  };

  beforeEach(async () => {
    shiftService = {
      openShift: jest.fn(),
      endShift: jest.fn(),
      findById: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftManagementController],
      providers: [
        { provide: ShiftManagementService, useValue: shiftService },
      ],
    }).compile();

    controller = module.get(ShiftManagementController);
  });

  it('openShift delegates to service', async () => {
    const shift = { id: 1, status: ShiftStatus.OPEN };
    shiftService.openShift.mockResolvedValue(shift);

    const result = await controller.openShift(
      { cashierId: 2 },
      { username: 'admin' } as any,
    );

    expect(shiftService.openShift).toHaveBeenCalledWith(
      { cashierId: 2 },
      'admin',
    );
    expect(result).toEqual(shift);
  });

  it('endShift delegates to service', async () => {
    const shift = { id: 1, status: ShiftStatus.CLOSED };
    shiftService.endShift.mockResolvedValue(shift);

    const result = await controller.endShift(
      1,
      { endMoney: 100 },
      { username: 'admin' } as any,
    );

    expect(shiftService.endShift).toHaveBeenCalledWith(
      1,
      { endMoney: 100 },
      'admin',
    );
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
