import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryRegion } from './delivery-region.entity';
import { DeliveryRegionService } from './delivery-region.service';
import { DeliveryRegionController } from './delivery-region.controller';
import { BranchModule } from '../branch/branch.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryRegion]), BranchModule],
  controllers: [DeliveryRegionController],
  providers: [DeliveryRegionService],
  exports: [DeliveryRegionService],
})
export class DeliveryRegionModule {}
