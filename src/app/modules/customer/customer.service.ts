import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDTO } from './dtos/create-customer.dto';
import { UpdateCustomerDTO } from './dtos/update-customer.dto';
import {
  mapCreateCustomerDtoToEntity,
  mapUpdateCustomerDtoToEntity,
} from './customer.mapper';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findById(id: number): Promise<Customer | undefined> {
    const result = await this.customerRepository.findOne({
      where: { id },
    });
    return result ?? undefined;
  }

  async findByPhone(phone: string): Promise<Customer | undefined> {
    const result = await this.customerRepository.findOne({
      where: { phone },
    });
    return result ?? undefined;
  }

  async findByFields(
    options: FindOneOptions<Customer>,
  ): Promise<Customer | undefined> {
    const result = await this.customerRepository.findOne(options);
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<Customer>,
  ): Promise<[Customer[], number]> {
    return this.customerRepository.findAndCount(options);
  }

  async save(dto: CreateCustomerDTO, creator?: string): Promise<Customer> {
    const customer = mapCreateCustomerDtoToEntity(dto);
    if (creator) {
      customer.createdBy = creator;
      customer.updatedBy = creator;
    }
    return this.customerRepository.save(customer);
  }

  async update(
    dto: UpdateCustomerDTO,
    updater?: string,
  ): Promise<UpdateCustomerDTO> {
    if (updater) {
      dto.updatedBy = updater;
    }
    const partial = mapUpdateCustomerDtoToEntity(dto);
    await this.customerRepository.update({ id: dto.id }, partial);
    return dto;
  }

  async delete(customer: Customer): Promise<Customer> {
    return this.customerRepository.remove(customer);
  }
}
