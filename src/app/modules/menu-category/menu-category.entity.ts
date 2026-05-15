import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { MenuItem } from '../menu-item/menu-item.entity';

@Entity('menu_categories')
export class MenuCategory extends BaseEntity {
  @Column({ name: 'name_ar', type: 'varchar', length: 100, nullable: false })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn?: string;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @OneToMany(() => MenuItem, (item) => item.category)
  items: MenuItem[];
}
