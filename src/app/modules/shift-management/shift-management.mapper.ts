/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ShiftManagement } from './shift-management.entity';
import { ShiftManagementDTO } from './dtos/shift-management.dto';
import { BaseDTO } from 'src/core/utils/base.dto';
import { mapBranchToBranchDtoSelective } from '../branch/branch.mapper';

const allowedShiftDtoKeys: ReadonlyArray<
  keyof ShiftManagementDTO | keyof BaseDTO
> = [
  'id',
  'branch',
  'cashier',
  'status',
  'startShift',
  'endShift',
  'endMoney',
  'actualEndMoney',
  'totalOrders',
  'notes',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

export function mapShiftManagementToShiftManagementDtoSelective(
  shift: ShiftManagement,
  keys?: (keyof ShiftManagementDTO | keyof BaseDTO)[],
): Partial<ShiftManagementDTO>;
export function mapShiftManagementToShiftManagementDtoSelective(
  shifts: ShiftManagement[],
  keys?: (keyof ShiftManagementDTO | keyof BaseDTO)[],
): Partial<ShiftManagementDTO>[];
export function mapShiftManagementToShiftManagementDtoSelective(
  shiftOrShifts: ShiftManagement | ShiftManagement[],
  keys?: (keyof ShiftManagementDTO | keyof BaseDTO)[],
): Partial<ShiftManagementDTO> | Partial<ShiftManagementDTO>[] {
  const mapSingle = (shift: ShiftManagement): Partial<ShiftManagementDTO> => {
    const dto: Partial<ShiftManagementDTO> = {};
    const keysToMap = (keys || allowedShiftDtoKeys).filter((key) =>
      allowedShiftDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in shift && shift[key as keyof ShiftManagement] !== undefined) {
        (dto as any)[key] = shift[key as keyof ShiftManagement];
      }
      if (key === 'branch' && shift.branch) {
        (dto as any)[key] = mapBranchToBranchDtoSelective(shift.branch);
      }
      if (key === 'cashier' && shift.cashier) {
        const { password: _password, ...cashier } = shift.cashier;
        (dto as any)[key] = cashier;
      }
    });

    return dto;
  };

  return Array.isArray(shiftOrShifts)
    ? shiftOrShifts.map(mapSingle)
    : mapSingle(shiftOrShifts);
}
