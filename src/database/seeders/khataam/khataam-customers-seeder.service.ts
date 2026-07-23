import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Customer } from 'src/app/modules/customer/customer.entity';
import { KhataamSeedCustomer, khataamCustomers } from './customers.data';

const CREATOR = 'khataam-seeder';
const BATCH_SIZE = 500;

@Injectable()
export class KhataamCustomersSeederService {
  private readonly logger = new Logger(KhataamCustomersSeederService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  private applySeedToCustomer(
    customer: Customer,
    seed: KhataamSeedCustomer,
  ): boolean {
    let changed = false;

    if (customer.name !== seed.name) {
      customer.name = seed.name;
      changed = true;
    }
    if ((customer.address ?? '') !== (seed.address ?? '')) {
      customer.address = seed.address;
      changed = true;
    }
    if (
      (customer.alternativePhone ?? '') !== (seed.alternativePhone ?? '')
    ) {
      customer.alternativePhone = seed.alternativePhone;
      changed = true;
    }
    if (customer.customerType !== seed.customerType) {
      customer.customerType = seed.customerType;
      changed = true;
    }

    return changed;
  }

  async seed(): Promise<void> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let duplicatePhones = 0;

    for (let i = 0; i < khataamCustomers.length; i += BATCH_SIZE) {
      const batch = khataamCustomers.slice(i, i + BATCH_SIZE);
      const phones = batch.map((c) => c.phone.trim()).filter(Boolean);
      const existingRows = await this.customerRepository.find({
        where: { phone: In(phones) },
      });
      const existingByPhone = new Map(
        existingRows.map((row) => [row.phone, row]),
      );

      const toSave = new Set<Customer>();

      for (const seed of batch) {
        const phone = seed.phone.trim();
        if (!phone) {
          skipped++;
          continue;
        }

        const existing = existingByPhone.get(phone);
        if (existing) {
          if (!existing.id) {
            duplicatePhones++;
            continue;
          }

          if (this.applySeedToCustomer(existing, seed)) {
            existing.updatedBy = CREATOR;
            toSave.add(existing);
            updated++;
          }
          continue;
        }

        const customer = this.customerRepository.create({
          name: seed.name.trim(),
          phone,
          address: seed.address?.trim() || undefined,
          alternativePhone: seed.alternativePhone?.trim() || undefined,
          customerType: seed.customerType,
          createdBy: CREATOR,
          updatedBy: CREATOR,
        });
        existingByPhone.set(phone, customer);
        toSave.add(customer);
        created++;
      }

      if (toSave.size) {
        await this.customerRepository.save([...toSave]);
      }
    }

    this.logger.debug(
      `Khataam customers seed done: created=${created}, updated=${updated}, skipped=${skipped}, duplicatePhones=${duplicatePhones}`,
    );
  }
}
