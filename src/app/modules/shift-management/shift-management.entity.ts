import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { decimalNumberTransformer } from 'src/core/utils/decimal-number.transformer';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';

@Entity('shift_managements')
export class ShiftManagement extends BaseEntity {
  @ManyToOne(() => Branch, (branch) => branch.shifts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @Column({ name: 'start_shift', type: 'timestamptz', nullable: false })
  startShift: Date;

  @Column({ name: 'end_shift', type: 'timestamptz', nullable: true })
  endShift?: Date;

  @Column({
    name: 'end_money',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  endMoney?: number;

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    nullable: false,
    default: ShiftStatus.OPEN,
  })
  status: ShiftStatus;

  @Column({ name: 'total_orders', type: 'int4', nullable: true })
  totalOrders?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => Order, (order) => order.shift)
  orders: Order[];
}
