import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { users } from './data';
import { transformPassword } from 'src/core/security';
import { User } from 'src/app/modules/user/user.entity';
import { UserDTO } from 'src/app/modules/user/dtos/user.dto';

/**
 * Service dealing with user based operations.
 *
 * @class
 */
@Injectable()
export class UserSeederService {
  /**
   * Create an instance of class.
   *
   * @constructs
   *
   * @param {Repository<User>} userRepository
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Seed all users.
   *
   * @function
   */
  create(): Array<Promise<User | null>> {
    return users.map((user: UserDTO) => this.seedOneUser(user));
  }

  private async seedOneUser(user: UserDTO): Promise<User | null> {
    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
    });
    if (dbUser) {
      return null;
    }
    await transformPassword(user);
    return this.userRepository.save(user as DeepPartial<User>);
  }
}
