import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerService } from './customer.service';
import { Customer } from './customer.entity';
import { CustomerType } from 'src/core/enums/customer-type';

describe('CustomerService', () => {
  let service: CustomerService;
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
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(CustomerService);
  });

  it('findById loads customer by id', async () => {
    repository.findOne.mockResolvedValue({ id: 1, name: 'Test' });

    await service.findById(1);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('findByPhone looks up by phone', async () => {
    repository.findOne.mockResolvedValue({ id: 2, phone: '01012345678' });

    const result = await service.findByPhone('01012345678');

    expect(result?.phone).toBe('01012345678');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { phone: '01012345678' },
    });
  });

  it('save maps dto and persists with creator', async () => {
    repository.save.mockImplementation(async (c) => ({ id: 5, ...c }));

    const result = await service.save(
      {
        name: 'محمد',
        phone: '01012345678',
        customerType: CustomerType.NORMAL,
        address: 'شارع الجلاء',
        secondaryAddress: 'شارع النصر',
        thirdAddress: 'شارع المعادي',
      },
      'admin',
    );

    expect(result.secondaryAddress).toBe('شارع النصر');
    expect(result.thirdAddress).toBe('شارع المعادي');

    expect(result.name).toBe('محمد');
    expect(result.phone).toBe('01012345678');
    expect(result.createdBy).toBe('admin');
  });

  it('update sets updater and calls repository.update', async () => {
    repository.update.mockResolvedValue(undefined);

    const dto = await service.update(
      { id: 2, name: 'Updated', customerType: CustomerType.SPECIAL },
      'admin',
    );

    expect(dto.updatedBy).toBe('admin');
    expect(repository.update).toHaveBeenCalledWith(
      { id: 2 },
      expect.objectContaining({
        name: 'Updated',
        customerType: CustomerType.SPECIAL,
      }),
    );
  });

  it('delete removes customer', async () => {
    const customer = { id: 1 } as Customer;
    repository.remove.mockResolvedValue(customer);

    await expect(service.delete(customer)).resolves.toBe(customer);
  });
});
