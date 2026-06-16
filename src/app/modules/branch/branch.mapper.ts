/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Branch } from './branch.entity';
import { BranchDTO } from './dtos/branch.dto';
import { CreateBranchDTO } from './dtos/create-branch.dto';
import { UpdateBranchDTO } from './dtos/update-branch.dto';
import { BaseDTO } from 'src/core/utils/base.dto';

const allowedBranchDtoKeys: ReadonlyArray<keyof BranchDTO | keyof BaseDTO> = [
  'id',
  'name',
  'type',
  'address',
  'phone',
  'servicePercentage',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

export function mapBranchToBranchDtoSelective(
  branch: Branch,
  keys?: (keyof BranchDTO | keyof BaseDTO)[],
): Partial<BranchDTO>;
export function mapBranchToBranchDtoSelective(
  branches: Branch[],
  keys?: (keyof BranchDTO | keyof BaseDTO)[],
): Partial<BranchDTO>[];
export function mapBranchToBranchDtoSelective(
  branchOrBranches: Branch | Branch[],
  keys?: (keyof BranchDTO | keyof BaseDTO)[],
): Partial<BranchDTO> | Partial<BranchDTO>[] {
  const mapSingle = (branch: Branch): Partial<BranchDTO> => {
    const dto: Partial<BranchDTO> = {};

    const keysToMap = (keys || allowedBranchDtoKeys).filter((key) =>
      allowedBranchDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in branch && branch[key as keyof Branch] !== undefined) {
        (dto as any)[key] = branch[key as keyof Branch];
      }
    });

    return dto;
  };

  return Array.isArray(branchOrBranches)
    ? branchOrBranches.map(mapSingle)
    : mapSingle(branchOrBranches);
}

export const mapCreateBranchDtoToEntity = (dto: CreateBranchDTO): Branch => {
  const branch = new Branch();

  branch.name = dto.name;
  branch.type = dto.type;
  branch.address = dto.address;
  if (dto.phone !== undefined) branch.phone = dto.phone;
  branch.servicePercentage = dto.servicePercentage ?? 0;

  return branch;
};

export const mapUpdateBranchDtoToEntity = (dto: UpdateBranchDTO): Branch => {
  const branch = new Branch();

  if (dto.id !== undefined) branch.id = dto.id;
  if (dto.name !== undefined) branch.name = dto.name;
  if (dto.type !== undefined) branch.type = dto.type;
  if (dto.address !== undefined) branch.address = dto.address;
  if (dto.phone !== undefined) branch.phone = dto.phone;
  if (dto.servicePercentage !== undefined) {
    branch.servicePercentage = dto.servicePercentage;
  }
  if (dto.createdBy !== undefined) branch.createdBy = dto.createdBy;
  if (dto.createdAt !== undefined) branch.createdAt = dto.createdAt;
  if (dto.updatedBy !== undefined) branch.updatedBy = dto.updatedBy;
  if (dto.updatedAt !== undefined) branch.updatedAt = dto.updatedAt;
  if (dto.deletedBy !== undefined) branch.deletedBy = dto.deletedBy;
  if (dto.deletedAt !== undefined) branch.deletedAt = dto.deletedAt;

  return branch;
};
