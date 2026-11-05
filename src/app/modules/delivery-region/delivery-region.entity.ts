import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { decimalNumberTransformer } from 'src/core/utils/decimal-number.transformer';
import { Branch } from '../branch/branch.entity';
import { Order } from '../order/order.entity';

@Entity('delivery_regions')
export class DeliveryRegion extends BaseEntity {
  @ManyToOne(() => Branch, (branch) => branch.deliveryRegions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ name: 'region_name', type: 'varchar', nullable: false })
  regionName: string;

  @Column({
    name: 'delivery_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    transformer: decimalNumberTransformer,
  })
  deliveryPrice: number;

  @OneToMany(() => Order, (order) => order.deliveryRegion)
  orders: Order[];
}
