import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BaseDTO } from 'src/core/utils/base.dto';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { BranchDTO } from '../../branch/dtos/branch.dto';
import { UserDTO } from '../../user/dtos/user.dto';

export class ShiftManagementDTO extends BaseDTO {
  @ApiProperty({ type: BranchDTO, required: false })
  @IsOptional()
  @Type(() => BranchDTO)
  branch?: BranchDTO;

  @ApiProperty({ type: UserDTO, required: false })
  @IsOptional()
  @Type(() => UserDTO)
  cashier?: Partial<UserDTO>;

  @ApiProperty({ enum: ShiftStatus })
  @IsEnum(ShiftStatus)
  status: ShiftStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  startShift?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  endShift?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  endMoney?: number;

  @ApiProperty({
    required: false,
    description: 'Sum of non-cancelled order totals for this shift (set on close)',
  })
  @IsOptional()
  @IsNumber()
  actualEndMoney?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalOrders?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OpenShiftDTO {
  @ApiProperty({
    example: 3,
    description: 'Cashier user id — branch is resolved from this user',
  })
  @IsInt()
  @Min(1)
  cashierId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EndShiftDTO {
  @ApiProperty({ example: 1250.75 })
  @IsNumber()
  @Min(0)
  endMoney: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
