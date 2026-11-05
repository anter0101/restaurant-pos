import { CustomerType } from 'src/core/enums/customer-type';

export interface KhataamSeedCustomer {
  name: string;
  phone: string;
  alternativePhone?: string;
  address?: string;
  customerType: CustomerType;
}

/**
 * Sample customers for local seeding. The real customer list is private client
 * data and is not committed. To seed real data, run
 * scripts/generate-khataam-customers-data.mjs locally and do not commit the output.
 */
export const khataamCustomers: KhataamSeedCustomer[] = [
  { name: 'Sample Customer 1', phone: '01000000001', customerType: CustomerType.NORMAL, address: 'Sample address 1' },
  { name: 'Sample Customer 2', phone: '01000000002', customerType: CustomerType.NORMAL, address: 'Sample address 2' },
  { name: 'Sample Customer 3', phone: '01000000003', alternativePhone: '01000000013', customerType: CustomerType.NORMAL },
  { name: 'Sample Customer 4', phone: '01000000004', customerType: CustomerType.NORMAL, address: 'Sample address 4' },
  { name: 'Sample Customer 5', phone: '01000000005', customerType: CustomerType.NORMAL },
];
