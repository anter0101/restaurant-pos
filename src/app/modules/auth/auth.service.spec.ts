import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { UserRole } from 'src/core/enums/user-role';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userService: { findByFields: jest.Mock };
  let jwtService: { sign: jest.Mock };

  const activeUser = {
    id: 1,
    username: 'admin',
    password: 'hashed',
    role: UserRole.ADMIN,
    isActive: true,
  };

  beforeEach(async () => {
    userService = { findByFields: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('login returns token for valid credentials', async () => {
    userService.findByFields.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      username: 'admin',
      password: '123456',
    });

    expect(result.access_token).toBe('signed-jwt');
    expect(jwtService.sign).toHaveBeenCalledWith({
      id: 1,
      username: 'admin',
      role: UserRole.ADMIN,
    });
  });

  it('login rejects invalid password', async () => {
    userService.findByFields.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ username: 'admin', password: 'wrong' }),
    ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
  });

  it('login rejects inactive user', async () => {
    userService.findByFields.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({ username: 'admin', password: '123456' }),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('generateToken signs jwt payload', () => {
    const token = service.generateToken({
      id: 2,
      username: 'cashier1',
      role: UserRole.CASHIER,
    });

    expect(token.access_token).toBe('signed-jwt');
  });
});
