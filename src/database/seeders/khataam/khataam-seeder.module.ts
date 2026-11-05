import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from 'src/app/modules/branch/branch.entity';
import { MenuCategory } from 'src/app/modules/menu-category/menu-category.entity';
import { MenuItem } from 'src/app/modules/menu-item/menu-item.entity';
import { RelMenuBranch } from 'src/app/modules/menu-item/rel-menu-branch.entity';
import { Customer } from 'src/app/modules/customer/customer.entity';
import { KhataamSeederService } from './khataam-seeder.service';
import { KhataamCustomersSeederService } from './khataam-customers-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      MenuCategory,
      MenuItem,
      RelMenuBranch,
      Customer,
    ]),
  ],
  providers: [KhataamSeederService, KhataamCustomersSeederService],
  exports: [KhataamSeederService, KhataamCustomersSeederService],
})
export class KhataamSeederModule {}
