import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/core/utils/base.entity';
import { UserRole } from 'src/core/enums/user-role';
import { Branch } from '../branch/branch.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ unique: true, type: 'varchar', nullable: false })
  username: string;

  @Exclude()
  @Column({ type: 'varchar', nullable: false })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;


  @ManyToOne(() => Branch, (branch) => branch.users, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;
}
