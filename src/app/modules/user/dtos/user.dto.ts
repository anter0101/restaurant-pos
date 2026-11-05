import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Exclude } from 'class-transformer';
import { BaseDTO } from 'src/core/utils/base.dto';
import { UserRole } from 'src/core/enums/user-role';
import { BranchDTO } from '../../branch/dtos/branch.dto';

/**
 * An User DTO object.
 */
export class UserDTO extends BaseDTO {
  @ApiProperty({ example: 'Jane Doe', description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'jdoe', description: 'Unique login username' })
  @IsString()
  @IsOptional()
  username: string;

  @ApiProperty({ example: 'secret', description: 'User password' })
  @IsString()
  password: string;

  @ApiProperty({
    example: '+15550101',
    description: 'Phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Staff role',
    required: true,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    example: true,
    description: 'status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;


  @ApiProperty({
    type: BranchDTO,
    description: 'Assigned branch',
    required: false,
  })
  @IsOptional()
  @Type(() => BranchDTO)
  branch?: BranchDTO | null;  
}
