import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, Validate } from 'class-validator';
import { PaginateDTO } from 'src/core/utils/paginate.dto';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { DateRangeWindowConstraint } from 'src/core/utils/date-range';

export class ShiftManagementQueryDTO extends PaginateDTO {
  @ApiProperty({
    required: false,
    example: '2026-10-01T00:00:00.000Z',
    description: 'Filter shifts whose startShift is >= from (inclusive)',
  })
  @Validate(DateRangeWindowConstraint)
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    required: false,
    example: '2026-10-31T23:59:59.999Z',
    description: 'Filter shifts whose startShift is <= to (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

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
