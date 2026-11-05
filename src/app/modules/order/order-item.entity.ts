import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { decimalNumberTransformer } from 'src/core/utils/decimal-number.transformer';
import { Order } from './order.entity';
import { MenuItem } from '../menu-item/menu-item.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => MenuItem, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ type: 'int4', nullable: false })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    transformer: decimalNumberTransformer,
  })
  unitPrice: number;

  @Column({ name: 'menu_item_name_ar', type: 'varchar', length: 150, nullable: true })
  menuItemNameAr?: string;

  @Column({ name: 'menu_item_name_en', type: 'varchar', length: 150, nullable: true })
  menuItemNameEn?: string;

}
