import {
  mapCreateDeliveryRegionDtoToEntity,
  mapDeliveryRegionToDeliveryRegionDtoSelective,
  mapUpdateDeliveryRegionDtoToEntity,
} from './delivery-region.mapper';
import { DeliveryRegion } from './delivery-region.entity';
import { Branch } from '../branch/branch.entity';
import { BranchType } from 'src/core/enums/branch-type';

describe('delivery-region.mapper', () => {
  it('mapCreateDeliveryRegionDtoToEntity links branch id', () => {
    const entity = mapCreateDeliveryRegionDtoToEntity({
      branchId: 3,
      regionName: 'West',
      deliveryPrice: 7,
    });

    expect(entity.branch.id).toBe(3);
    expect(entity.regionName).toBe('West');
    expect(entity.deliveryPrice).toBe(7);
  });

  it('mapUpdateDeliveryRegionDtoToEntity maps branchId when provided', () => {
    const entity = mapUpdateDeliveryRegionDtoToEntity({
      id: 1,
      branchId: 9,
      regionName: 'Updated',
    });

    expect(entity.branch?.id).toBe(9);
    expect(entity.regionName).toBe('Updated');
  });

  it('mapDeliveryRegionToDeliveryRegionDtoSelective nests branch dto', () => {
    const branch = Object.assign(new Branch(), {
      id: 1,
      name: 'Main',
      type: BranchType.DINE_IN,
      address: 'Addr',
      servicePercentage: 0,
      nextOrderQueue: 0,
    });
    const region = Object.assign(new DeliveryRegion(), {
      id: 10,
      regionName: 'Central',
      deliveryPrice: 5,
      branch,
    });

    const dto = mapDeliveryRegionToDeliveryRegionDtoSelective(region, [
      'id',
      'regionName',
      'deliveryPrice',
      'branch',
    ]);

    expect(dto.regionName).toBe('Central');
    expect(dto.branch).toEqual(
      expect.objectContaining({ id: 1, name: 'Main' }),
    );
  });
});
