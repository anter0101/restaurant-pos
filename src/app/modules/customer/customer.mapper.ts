/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Customer } from './customer.entity';
import { CustomerDTO } from './dtos/customer.dto';
import { CreateCustomerDTO } from './dtos/create-customer.dto';
import { UpdateCustomerDTO } from './dtos/update-customer.dto';
import { BaseDTO } from 'src/core/utils/base.dto';
import { DeliveryRegion } from '../delivery-region/delivery-region.entity';
import { mapDeliveryRegionToDeliveryRegionDtoSelective } from '../delivery-region/delivery-region.mapper';

const allowedCustomerDtoKeys: ReadonlyArray<keyof CustomerDTO | keyof BaseDTO> = [
  'id',
  'name',
  'phone',
  'alternativePhone',
  'address',
  'customerType',
  'defaultDeliveryRegion',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

export function mapCustomerToCustomerDtoSelective(
  customer: Customer,
  keys?: (keyof CustomerDTO | keyof BaseDTO)[],
): Partial<CustomerDTO>;
export function mapCustomerToCustomerDtoSelective(
  customers: Customer[],
  keys?: (keyof CustomerDTO | keyof BaseDTO)[],
): Partial<CustomerDTO>[];
export function mapCustomerToCustomerDtoSelective(
  customerOrCustomers: Customer | Customer[],
  keys?: (keyof CustomerDTO | keyof BaseDTO)[],
): Partial<CustomerDTO> | Partial<CustomerDTO>[] {
  const mapSingle = (customer: Customer): Partial<CustomerDTO> => {
    const dto: Partial<CustomerDTO> = {};
    const keysToMap = (keys || allowedCustomerDtoKeys).filter((key) =>
      allowedCustomerDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in customer && customer[key as keyof Customer] !== undefined) {
        (dto as any)[key] = customer[key as keyof Customer];
      }
      if (key === 'defaultDeliveryRegion' && customer.defaultDeliveryRegion) {
        (dto as any)[key] = mapDeliveryRegionToDeliveryRegionDtoSelective(
          customer.defaultDeliveryRegion,
        );
      }
    });

    return dto;
  };

  return Array.isArray(customerOrCustomers)
    ? customerOrCustomers.map(mapSingle)
    : mapSingle(customerOrCustomers);
}

export function mapCreateCustomerDtoToEntity(dto: CreateCustomerDTO): Customer {
  const customer = new Customer();
  customer.name = dto.name.trim();
  customer.phone = dto.phone.trim();
  customer.alternativePhone = dto.alternativePhone?.trim() || undefined;
  customer.address = dto.address?.trim() || undefined;
  customer.customerType = dto.customerType;
  if (dto.defaultDeliveryRegionId !== undefined) {
    const region = new DeliveryRegion();
    region.id = dto.defaultDeliveryRegionId;
    customer.defaultDeliveryRegion = region;
  }
  return customer;
}

export function mapUpdateCustomerDtoToEntity(
  dto: UpdateCustomerDTO,
): Partial<Customer> {
  const partial: Partial<Customer> = {};

  if (dto.id !== undefined) partial.id = dto.id;
  if (dto.name !== undefined) partial.name = dto.name.trim();
  if (dto.phone !== undefined) partial.phone = dto.phone.trim();
  if (dto.alternativePhone !== undefined) {
    partial.alternativePhone = dto.alternativePhone?.trim() || undefined;
  }
  if (dto.address !== undefined) {
    partial.address = dto.address?.trim() || undefined;
  }
  if (dto.customerType !== undefined) partial.customerType = dto.customerType;
  if (dto.defaultDeliveryRegionId !== undefined) {
    const region = new DeliveryRegion();
    region.id = dto.defaultDeliveryRegionId;
    partial.defaultDeliveryRegion = region;
  }
  if (dto.updatedBy !== undefined) partial.updatedBy = dto.updatedBy;

  return partial;
}
