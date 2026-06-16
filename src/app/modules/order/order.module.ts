import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';
import { DeliveryRegion } from '../delivery-region/delivery-region.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { MenuItem } from '../menu-item/menu-item.entity';
import { RelMenuBranch } from '../menu-item/rel-menu-branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Branch,
      User,
      DeliveryRegion,
      ShiftManagement,
      MenuItem,
      RelMenuBranch,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
