import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { UpdateUserDTO } from './dtos/update-user.dto';
import { transformPassword } from 'src/core/security';
import { UserRole } from 'src/core/enums/user-role';
import { UserDTO } from './dtos/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | undefined> {
    const result = await this.userRepository.findOne({ where: { id } });
    return result ?? undefined;
  }

  async findByFields(
    options: FindOneOptions<User>,
  ): Promise<User | undefined> {
    const result = await this.userRepository.findOne(options);
    return result ?? undefined;
  }

  async find(
    options: FindManyOptions<User>,
  ): Promise<User | undefined> {
    const result = await this.userRepository.findOne(options);
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<User>,
  ): Promise<[User[], number]> {
    const resultList = await this.userRepository.findAndCount(options);
    return resultList;
  }

  async save(
    userEntity: User,
    creator?: string,
    updatePassword = false,
  ): Promise<User> {
    if (updatePassword) {
      await transformPassword(userEntity);
    }
    if (creator) {
      if (!userEntity.createdBy) {
        userEntity.createdBy = creator;
      }
      userEntity.updatedBy = creator;
    }

    if (!userEntity.username?.trim()) {
      userEntity.username = await this.generateUsername(
        userEntity.role ?? UserRole.USER,
      );
    }

    console.log(userEntity);
    const result = await this.userRepository.save(userEntity);
    return result;
  }

  async update(
    userEntity: User,
    updater?: string,
  ): Promise<User> {
    if (updater) {
      userEntity.updatedBy = updater;
    }
    if (userEntity.password) {
      await transformPassword(userEntity);
    }

    await this.userRepository.update(
      {
        id: userEntity.id,
      },
      userEntity,
    );
    return userEntity;
  }

  async delete(userDTO: User): Promise<User | undefined> {
    const result = await this.userRepository.remove(userDTO);
    return result;
  }

 
  

  /** Unique login id like `USR-4821`, `EMP-7742`, `STF-9912` (role prefix + 4 digits). */
  async generateUsername(role: UserRole): Promise<string> {
    for (let i = 0; i < 50; i++) {
      const num = Math.floor(1000 + Math.random() * 9000);
      const username = `${'EMP'}${num}`;
      const taken = await this.userRepository.findOne({
        where: { username },
        select: { id: true },
      });
      if (!taken) return username;
    }
    return `${'USR'}${1000 + (Date.now() % 9000)}`;
  }
}
