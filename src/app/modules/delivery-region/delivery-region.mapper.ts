/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { DeliveryRegion } from './delivery-region.entity';
import { DeliveryRegionDTO } from './dtos/delivery-region.dto';
import { CreateDeliveryRegionDTO } from './dtos/create-delivery-region.dto';
import { BaseDTO } from 'src/core/utils/base.dto';
import { Branch } from '../branch/branch.entity';
import { mapBranchToBranchDtoSelective } from '../branch/branch.mapper';
import { UpdateDeliveryRegionDTO } from './dtos/update-delivery-region.dto';

const allowedDeliveryRegionDtoKeys: ReadonlyArray<
  keyof DeliveryRegionDTO | keyof BaseDTO
> = [
  'id',
  'branch',
  'regionName',
  'deliveryPrice',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

export function mapDeliveryRegionToDeliveryRegionDtoSelective(
  region: DeliveryRegion,
  keys?: (keyof DeliveryRegionDTO | keyof BaseDTO)[],
): Partial<DeliveryRegionDTO>;
export function mapDeliveryRegionToDeliveryRegionDtoSelective(
  regions: DeliveryRegion[],
  keys?: (keyof DeliveryRegionDTO | keyof BaseDTO)[],
): Partial<DeliveryRegionDTO>[];
export function mapDeliveryRegionToDeliveryRegionDtoSelective(
  regionOrRegions: DeliveryRegion | DeliveryRegion[],
  keys?: (keyof DeliveryRegionDTO | keyof BaseDTO)[],
): Partial<DeliveryRegionDTO> | Partial<DeliveryRegionDTO>[] {
  const mapSingle = (region: DeliveryRegion): Partial<DeliveryRegionDTO> => {
    const dto: Partial<DeliveryRegionDTO> = {};

    const keysToMap = (keys || allowedDeliveryRegionDtoKeys).filter((key) =>
      allowedDeliveryRegionDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in region && region[key as keyof DeliveryRegion] !== undefined) {
        (dto as any)[key] = region[key as keyof DeliveryRegion];
      }
      if (key === 'branch' && region.branch) {
        (dto as any)[key] = mapBranchToBranchDtoSelective(region.branch);
      }
    });

    return dto;
  };

  return Array.isArray(regionOrRegions)
    ? regionOrRegions.map(mapSingle)
    : mapSingle(regionOrRegions);
}

export const mapCreateDeliveryRegionDtoToEntity = (
  dto: CreateDeliveryRegionDTO,
): DeliveryRegion => {
  const region = new DeliveryRegion();
  const branch = new Branch();
  branch.id = dto.branchId;
  region.branch = branch;
  region.regionName = dto.regionName;
  region.deliveryPrice = dto.deliveryPrice;
  return region;
};

export const mapUpdateDeliveryRegionDtoToEntity = (
  dto: UpdateDeliveryRegionDTO,
): DeliveryRegion => {
  const region = new DeliveryRegion();

  if (dto.id !== undefined) region.id = dto.id;
  if (dto.regionName !== undefined) region.regionName = dto.regionName;
  if (dto.deliveryPrice !== undefined) region.deliveryPrice = dto.deliveryPrice;
  if (dto.branchId !== undefined) {
    const branch = new Branch();
    branch.id = dto.branchId;
    region.branch = branch;
  }
  if (dto.createdBy !== undefined) region.createdBy = dto.createdBy;
  if (dto.createdAt !== undefined) region.createdAt = dto.createdAt;
  if (dto.updatedBy !== undefined) region.updatedBy = dto.updatedBy;
  if (dto.updatedAt !== undefined) region.updatedAt = dto.updatedAt;
  if (dto.deletedBy !== undefined) region.deletedBy = dto.deletedBy;
  if (dto.deletedAt !== undefined) region.deletedAt = dto.deletedAt;

  return region;
};
