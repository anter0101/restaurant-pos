import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { decimalNumberTransformer } from 'src/core/utils/decimal-number.transformer';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { Branch } from '../branch/branch.entity';
import { Customer } from '../customer/customer.entity';
import { DeliveryRegion } from '../delivery-region/delivery-region.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { OrderItem } from './order-item.entity';
@Entity('orders')
export class Order extends BaseEntity {
  @ManyToOne(() => Branch, (branch) => branch.orders, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ManyToOne(() => DeliveryRegion, (region) => region.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'delivery_region_id' })
  deliveryRegion?: DeliveryRegion;

  @ManyToOne(() => ShiftManagement, (shift) => shift.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'shift_management_id' })
  shift?: ShiftManagement;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    transformer: decimalNumberTransformer,
  })
  totalAmount: number;

  @Column({ name: 'order_queue', type: 'int4', nullable: false })
  orderQueue: number;

 

  @Column({
    name: 'delivery_address',
    type: 'varchar',
    nullable: true,
  })
  deliveryAddress?: string;

  @Column({
    name: 'delivery_fees',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  deliveryFees: number;

  @Column({
    name: 'service_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  serviceFee: number;

  @Column({
    name: 'items_subtotal',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    transformer: decimalNumberTransformer,
  })
  itemsSubtotal: number;

  @Column({
    name: 'order_type',
    type: 'enum',
    enum: OrderType,
    nullable: false,
  })
  orderType: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    nullable: false,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
