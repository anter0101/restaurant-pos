import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { BaseDTO } from 'src/core/utils/base.dto';
import { BranchType } from 'src/core/enums/branch-type';

export class BranchDTO extends BaseDTO {
  @ApiProperty({ example: 'Main Street', description: 'Branch display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: BranchType,
    description: 'How this branch serves customers',
  })
  @IsEnum(BranchType)
  @IsNotEmpty()
  type: BranchType;

  @ApiProperty({ example: '123 Example Rd', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: '+15550101',
    description: 'Contact phone',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
