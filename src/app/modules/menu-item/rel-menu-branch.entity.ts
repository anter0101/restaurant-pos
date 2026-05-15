import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Branch } from '../branch/branch.entity';
import { MenuItem } from './menu-item.entity';

@Entity('rel_menu_branches')
@Unique(['branchId', 'menuItemId'])
export class RelMenuBranch {
  @PrimaryColumn({ name: 'branch_id' })
  branchId: number;

  @PrimaryColumn({ name: 'menu_item_id' })
  menuItemId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => MenuItem, (item) => item.branchRelations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;
}
