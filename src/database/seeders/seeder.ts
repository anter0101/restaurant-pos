import { Injectable, Logger } from '@nestjs/common';
import { UserSeederService } from './user/user-seeder.service';
import { KhataamSeederService } from './khataam/khataam-seeder.service';

@Injectable()
export class Seeder {
  constructor(
    private readonly logger: Logger,
    private readonly userSeederService: UserSeederService,
    private readonly khataamSeederService: KhataamSeederService,
  ) {}
  async seed() {
    await this.users()
      .then(() => {
        this.logger.debug('Successfully completed seeding users...');
        return true;
      })
      .catch((error) => {
        this.logger.error('Failed seeding users...');
        throw error;
      });

    await this.khataam();
  }

  async users() {
    return await Promise.all(this.userSeederService.create())
      .then((createdUsers) => {
        this.logger.debug(
          'No. of users created : ' +
            createdUsers.filter(
              (nullValueOrCreatedUser) => nullValueOrCreatedUser,
            ).length,
        );
        return true;
      })
      .catch((error) => {
        throw error;
      });
  }

  async khataam() {
    try {
      await this.khataamSeederService.seed();
      this.logger.debug('Successfully completed seeding Khataam menu...');
    } catch (error) {
      this.logger.error('Failed seeding Khataam menu...');
      throw error;
    }
  }
}
