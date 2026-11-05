import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from 'src/core/enums/user-role';
import { User } from 'src/app/modules/user/user.entity';

/**
 * Admin may pass any branchId (or omit for all branches).
 * Manager is locked to their assigned branch.
 */
export function resolveScopedBranchId(
  user: User,
  requestedBranchId?: number,
): number | undefined {
  if (user.role === UserRole.ADMIN) {
    return requestedBranchId;
  }

  if (!user.branch?.id) {
    throw new BadRequestException('User is not assigned to a branch');
  }

  if (
    requestedBranchId !== undefined &&
    requestedBranchId !== user.branch.id
  ) {
    throw new ForbiddenException('Cannot access another branch');
  }

  return user.branch.id;
}

export function assertShiftBranchAccess(
  user: User,
  shiftBranchId: number | undefined,
): void {
  if (user.role === UserRole.ADMIN) {
    return;
  }
  if (!user.branch?.id) {
    throw new BadRequestException('User is not assigned to a branch');
  }
  if (shiftBranchId !== user.branch.id) {
    throw new ForbiddenException('Cannot access a shift from another branch');
  }
}
