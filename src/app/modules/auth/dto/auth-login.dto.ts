import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * A DTO representing a login user.
 */
export class AuthLoginDTO {
  @ApiProperty({ description: 'Username' })
  @IsString()
  readonly username: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  readonly password: string;

  @ApiProperty({ description: 'User remember login', required: false })
  readonly rememberMe?: number;
}
