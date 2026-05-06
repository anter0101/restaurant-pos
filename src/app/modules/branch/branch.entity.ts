import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/core/utils/base.entity';
import { BranchType } from 'src/core/enums/branch-type';
import { User } from '../user/user.entity';

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

  @OneToMany(() => User, (user) => user.branch)
  users: User[];
}
