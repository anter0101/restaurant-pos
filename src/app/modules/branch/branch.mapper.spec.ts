import {
  mapBranchToBranchDtoSelective,
  mapCreateBranchDtoToEntity,
  mapUpdateBranchDtoToEntity,
} from './branch.mapper';
import { Branch } from './branch.entity';
import { BranchType } from 'src/core/enums/branch-type';

describe('branch.mapper', () => {
  it('mapCreateBranchDtoToEntity sets defaults', () => {
    const entity = mapCreateBranchDtoToEntity({
      name: 'Main',
      type: BranchType.TAKEAWAY,
      address: 'Street 1',
    });

    expect(entity.name).toBe('Main');
    expect(entity.isSteppedKitchen).toBe(false);
    expect(entity.servicePercentage).toBe(0);
  });

  it('mapUpdateBranchDtoToEntity maps only provided fields', () => {
    const entity = mapUpdateBranchDtoToEntity({
      id: 2,
      servicePercentage: 0.2,
    });

    expect(entity.id).toBe(2);
    expect(entity.servicePercentage).toBe(0.2);
    expect(entity.name).toBeUndefined();
  });

  it('mapBranchToBranchDtoSelective projects fields', () => {
    const branch = Object.assign(new Branch(), {
      id: 1,
      name: 'Main',
      type: BranchType.DINE_IN,
      address: 'A',
      servicePercentage: 0.05,
      nextOrderQueue: 3,
    });

    const dto = mapBranchToBranchDtoSelective(branch, [
      'id',
      'name',
      'servicePercentage',
    ]);

    expect(dto).toEqual({
      id: 1,
      name: 'Main',
      servicePercentage: 0.05,
    });
  });
});
