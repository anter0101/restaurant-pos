/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { User } from './user.entity';
import { UserDTO } from './dtos/user.dto';
import { CreateUserDTO } from './dtos/create-user.dto';
import { UpdateUserDTO } from './dtos/update-user.dto';
import { BaseDTO } from 'src/core/utils/base.dto';
import { Branch } from '../branch/branch.entity';
import { mapBranchToBranchDtoSelective } from '../branch/branch.mapper';

const allowedUserDtoKeys: ReadonlyArray<keyof UserDTO | keyof BaseDTO> = [
  'id',
  'name',
  'username',
  'phone',
  'role',
  'isActive',
  'branch',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

export function mapUserToUserDtoSelective(
  user: User,
  keys?: (keyof UserDTO |  keyof BaseDTO)[],
): Partial<UserDTO>;
export function mapUserToUserDtoSelective(
  users: User[],
  keys?: (keyof UserDTO | keyof BaseDTO)[],
): Partial<UserDTO>[];
export function mapUserToUserDtoSelective(
  userOrUsers: User | User[],
  keys?: (keyof UserDTO | keyof BaseDTO)[],
): Partial<UserDTO> | Partial<UserDTO>[] {
  const mapSingle = (user: User): Partial<UserDTO> => {
    const dto: Partial<UserDTO> = {};

    const keysToMap = (keys || allowedUserDtoKeys).filter((key) =>
      allowedUserDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in user && user[key as keyof User] !== undefined) {
        (dto as any)[key] = user[key as keyof User];
      }
      if (key === 'branch' && user.branch) {
        (dto as any)[key] = mapBranchToBranchDtoSelective(user.branch);
      } 
    });

    return dto;
  };

  return Array.isArray(userOrUsers)
    ? userOrUsers.map(mapSingle)
    : mapSingle(userOrUsers);
}

export const mapCreateUserDtoToEntity = (dto: CreateUserDTO): User => {
  const user = new User();

  user.name = dto.name;
  user.password = dto.password;
  user.role = dto.role;
  if (dto.username !== undefined) user.username = dto.username;
  if (dto.phone !== undefined) user.phone = dto.phone;
  if (dto.isActive !== undefined) user.isActive = dto.isActive;
  if (dto.branchId !== undefined) {
    const branch = new Branch();
    branch.id = dto.branchId;
    user.branch = branch;
  }

    return user;
};

export const mapUpdateUserDtoToEntity = (dto: UpdateUserDTO): User => {
  const user = new User();

  if (dto.id !== undefined) user.id = dto.id;
  if (dto.name !== undefined) user.name = dto.name;
  if (dto.username !== undefined) user.username = dto.username;
  if (dto.password !== undefined) user.password = dto.password;
  if (dto.phone !== undefined) user.phone = dto.phone;
  if (dto.role !== undefined) user.role = dto.role;
  if (dto.isActive !== undefined) user.isActive = dto.isActive;
  if (dto.branchId !== undefined) {
    const branch = new Branch();
    branch.id = dto.branchId;
    user.branch = branch;
  }

  if (dto.createdBy !== undefined) user.createdBy = dto.createdBy;
  if (dto.createdAt !== undefined) user.createdAt = dto.createdAt;
  if (dto.updatedBy !== undefined) user.updatedBy = dto.updatedBy;
  if (dto.updatedAt !== undefined) user.updatedAt = dto.updatedAt;
  if (dto.deletedBy !== undefined) user.deletedBy = dto.deletedBy;
  if (dto.deletedAt !== undefined) user.deletedAt = dto.deletedAt;

  return user;
};
