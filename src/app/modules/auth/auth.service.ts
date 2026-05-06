import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Equal } from 'typeorm';
import { UserService } from 'src/app/modules/user/user.service';
import { AuthLoginDTO } from './dto/auth-login.dto';
import { JwtPayload } from 'src/core/security/interfaces/jwt-payload.interface';
import { UserDTO } from 'src/app/modules/user/dtos/user.dto';
import { User } from 'src/app/modules/user/user.entity';
import { UserRole } from 'src/core/enums/user-role';
import { GeneratedToken } from 'src/core/security/interfaces/token.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(userLogin: AuthLoginDTO): Promise<GeneratedToken> {
    const loginUsername = userLogin.username;
    const loginPassword = userLogin.password;

    const userFind = await this.userService.findByFields({
      where: { username: Equal(loginUsername) },
    });
    const validPassword =
      !!userFind && (await bcrypt.compare(loginPassword, userFind.password));
    if (!userFind || !validPassword) {
      throw new HttpException(
        'Invalid login username or password!',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (userFind && !userFind.isActive) {
      throw new HttpException(
        'Your account is not been activated!',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.generateToken(userFind);
  }

  async validateUser(payload: JwtPayload) {
    return await this.userService.findByFields({
      where: { id: Equal(payload.id) },
    });
  }

  generateToken(user: Pick<User, 'id' | 'username' | 'role'>): GeneratedToken {
    const payload: JwtPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

}
