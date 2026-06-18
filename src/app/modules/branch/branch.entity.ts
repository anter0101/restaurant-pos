import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { BranchType } from 'src/core/enums/branch-type';
import { decimalNumberTransformer } from 'src/core/utils/decimal-number.transformer';
import { User } from '../user/user.entity';
import { DeliveryRegion } from '../delivery-region/delivery-region.entity';
import { Order } from '../order/order.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';

@Entity('branches')
export class Branch extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ name: 'branch_type', type: 'enum', enum: BranchType, nullable: false })
  type: BranchType;

  @Column({ type: 'varchar', nullable: false })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({
    name: 'is_stepped_kitchen',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isSteppedKitchen: boolean;

  @Column({
    name: 'service_percentage',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: false,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  servicePercentage: number;

  @Column({ name: 'next_order_queue', type: 'int4', nullable: false, default: 0 })
  nextOrderQueue: number;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];

  @OneToMany(() => DeliveryRegion, (region) => region.branch)
  deliveryRegions: DeliveryRegion[];

  @OneToMany(() => Order, (order) => order.branch)
  orders: Order[];

  @OneToMany(() => ShiftManagement, (shift) => shift.branch)
  shifts: ShiftManagement[];
}
