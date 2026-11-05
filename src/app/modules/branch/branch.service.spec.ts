import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BranchService } from './branch.service';
import { Branch } from './branch.entity';
import { BranchType } from 'src/core/enums/branch-type';

describe('BranchService', () => {
  let service: BranchService;
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
        BranchService,
        { provide: getRepositoryToken(Branch), useValue: repository },
      ],
    }).compile();

    service = module.get(BranchService);
  });

  it('findById returns branch when found', async () => {
    const branch = { id: 1, name: 'Main' };
    repository.findOne.mockResolvedValue(branch);

    await expect(service.findById(1)).resolves.toEqual(branch);
  });

  it('findById returns undefined when not found', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById(99)).resolves.toBeUndefined();
  });

  it('save maps dto and sets audit fields', async () => {
    repository.save.mockImplementation(async (b) => ({ id: 1, ...b }));

    const result = await service.save(
      {
        name: 'Downtown',
        type: BranchType.DINE_IN,
        address: '1 Main St',
        servicePercentage: 0.1,
      },
      'admin',
    );

    expect(result.name).toBe('Downtown');
    expect(result.servicePercentage).toBe(0.1);
    expect(result.createdBy).toBe('admin');
    expect(repository.save).toHaveBeenCalled();
  });

  it('update applies partial entity and returns dto', async () => {
    repository.update.mockResolvedValue(undefined);

    const dto = await service.update(
      { id: 1, name: 'Renamed', servicePercentage: 0.15 },
      'admin',
    );

    expect(dto.updatedBy).toBe('admin');
    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      expect.objectContaining({ name: 'Renamed' }),
    );
  });

  it('delete removes branch', async () => {
    const branch = { id: 1 } as Branch;
    repository.remove.mockResolvedValue(branch);

    await expect(service.delete(branch)).resolves.toEqual(branch);
  });
});
