import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { CustomerType } from 'src/core/enums/customer-type';
import { Order } from '../order/order.entity';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false, unique: true })
  phone: string;

  @Column({
    name: 'alternative_phone',
    type: 'varchar',
    nullable: true,
  })
  alternativePhone?: string;

  @Column({ type: 'varchar', nullable: true })
  address?: string;

  @Column({
    name: 'secondary_address',
    type: 'varchar',
    nullable: true,
  })
  secondaryAddress?: string;

  @Column({
    name: 'third_address',
    type: 'varchar',
    nullable: true,
  })
  thirdAddress?: string;

  @Column({
    name: 'customer_type',
    type: 'enum',
    enum: CustomerType,
    nullable: false,
    default: CustomerType.NORMAL,
  })
  customerType: CustomerType;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];
}
