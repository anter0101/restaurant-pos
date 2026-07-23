import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './customer.entity';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { DeliveryRegionModule } from '../delivery-region/delivery-region.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), DeliveryRegionModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
