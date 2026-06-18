import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryRegionService } from './delivery-region.service';
import { DeliveryRegion } from './delivery-region.entity';

describe('DeliveryRegionService', () => {
  let service: DeliveryRegionService;
  let repository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryRegionService,
        {
          provide: getRepositoryToken(DeliveryRegion),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(DeliveryRegionService);
  });

  it('findById loads branch relation', async () => {
    repository.findOne.mockResolvedValue({ id: 1, regionName: 'North' });

    await service.findById(1);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['branch'],
    });
  });

  it('save maps dto and persists', async () => {
    repository.save.mockImplementation(async (r) => ({ id: 5, ...r }));

    const result = await service.save(
      { branchId: 1, regionName: 'Downtown', deliveryPrice: 4.5 },
      'admin',
    );

    expect(result.regionName).toBe('Downtown');
    expect(result.deliveryPrice).toBe(4.5);
    expect(result.createdBy).toBe('admin');
  });

  it('update sets updater and calls repository.update', async () => {
    repository.update.mockResolvedValue(undefined);

    const dto = await service.update(
      { id: 2, deliveryPrice: 6 },
      'admin',
    );

    expect(dto.updatedBy).toBe('admin');
    expect(repository.update).toHaveBeenCalledWith(
      { id: 2 },
      expect.objectContaining({ deliveryPrice: 6 }),
    );
  });

  it('delete removes region', async () => {
    const region = { id: 1 } as DeliveryRegion;
    repository.remove.mockResolvedValue(region);

    await expect(service.delete(region)).resolves.toEqual(region);
  });
});
