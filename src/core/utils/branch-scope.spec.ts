import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from 'src/core/enums/user-role';
import { User } from 'src/app/modules/user/user.entity';
import { resolveScopedBranchId } from './branch-scope';

describe('resolveScopedBranchId', () => {
  it('lets admin omit or pick a branch', () => {
    const admin = { role: UserRole.ADMIN } as User;
    expect(resolveScopedBranchId(admin, undefined)).toBeUndefined();
    expect(resolveScopedBranchId(admin, 3)).toBe(3);
  });

  it('locks manager to their branch', () => {
    const manager = {
      role: UserRole.MANAGER,
      branch: { id: 2 },
    } as User;
    expect(resolveScopedBranchId(manager, undefined)).toBe(2);
    expect(resolveScopedBranchId(manager, 2)).toBe(2);
  });

  it('forbids manager from another branch', () => {
    const manager = {
      role: UserRole.MANAGER,
      branch: { id: 2 },
    } as User;
    expect(() => resolveScopedBranchId(manager, 9)).toThrow(ForbiddenException);
  });

  it('rejects manager without a branch', () => {
    const manager = { role: UserRole.MANAGER } as User;
    expect(() => resolveScopedBranchId(manager, undefined)).toThrow(
      BadRequestException,
    );
  });
});
