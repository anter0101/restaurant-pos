import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { MenuCategory } from '../menu-category/menu-category.entity';
import { RelMenuBranch } from './rel-menu-branch.entity';

@Entity('menu_items')
export class MenuItem extends BaseEntity {
  @ManyToOne(() => MenuCategory, (category) => category.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'menu_category_id' })
  category: MenuCategory;

  @Column({ name: 'name_ar', type: 'varchar', length: 150, nullable: false })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 150, nullable: true })
  nameEn?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'default_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  defaultPrice: number;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @OneToMany(() => RelMenuBranch, (rel) => rel.menuItem)
  branchRelations: RelMenuBranch[];
}
