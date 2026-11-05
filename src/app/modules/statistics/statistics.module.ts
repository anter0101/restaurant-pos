import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/order.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { Branch } from '../branch/branch.entity';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, ShiftManagement, Branch])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
