import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KhataamCustomersSeederService } from './khataam-customers-seeder.service';
import { Customer } from 'src/app/modules/customer/customer.entity';
import { CustomerType } from 'src/core/enums/customer-type';

jest.mock('./customers.data', () => ({
  khataamCustomers: [
    {
      name: 'Alice',
      phone: '01011111111',
      customerType: 'NORMAL',
      address: 'A',
    },
    {
      name: 'Bob',
      phone: '01022222222',
      customerType: 'SPECIAL',
    },
  ],
}));

describe('KhataamCustomersSeederService', () => {
  let service: KhataamCustomersSeederService;
  let repository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KhataamCustomersSeederService,
        {
          provide: getRepositoryToken(Customer),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(KhataamCustomersSeederService);
  });

  it('creates all customers when none exist', async () => {
    await service.seed();

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ phone: '01011111111', createdBy: 'khataam-seeder' }),
        expect.objectContaining({ phone: '01022222222', customerType: CustomerType.SPECIAL }),
      ]),
    );
  });

  it('updates existing customer when seed data changes', async () => {
    repository.find.mockResolvedValue([
      {
        id: 1,
        name: 'Old',
        phone: '01011111111',
        address: 'A',
        customerType: CustomerType.NORMAL,
      },
    ]);

    await service.seed();

    expect(repository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Alice', updatedBy: 'khataam-seeder' }),
        expect.objectContaining({ phone: '01022222222' }),
      ]),
    );
  });
});
