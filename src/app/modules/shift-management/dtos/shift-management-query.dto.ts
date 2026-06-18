import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PaginateDTO } from 'src/core/utils/paginate.dto';
import { ShiftStatus } from 'src/core/enums/shift-status';

export class ShiftManagementQueryDTO extends PaginateDTO {
  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashierId?: number;

  @ApiProperty({ enum: ShiftStatus, required: false })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
}
