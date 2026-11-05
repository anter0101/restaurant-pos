import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Validate,
} from 'class-validator';
import { DateRangeWindowConstraint, RequiredDateRangeQueryDTO } from 'src/core/utils/date-range';

export class StatisticsDashboardQueryDTO extends RequiredDateRangeQueryDTO {
  @ApiProperty({
    required: false,
    description: 'Admin only. Manager is always scoped to their own branch.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @ApiProperty({ required: false, default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  topItemsLimit?: number = 10;
}

export class PrintShiftOrdersQueryDTO {
  @ApiProperty({ description: 'Shift id to print' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shiftId!: number;

  @ApiProperty({
    required: false,
    description:
      'Optional extra clip on order createdAt. Defaults to shift startShift / endShift (or now if still open).',
  })
  @Validate(DateRangeWindowConstraint)
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PrintBranchKpisQueryDTO extends RequiredDateRangeQueryDTO {
  @ApiProperty({
    required: false,
    description: 'Required for admin. Manager uses their own branch.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  topItemsLimit?: number = 10;
}

export class PrintSummaryQueryDTO extends StatisticsDashboardQueryDTO {}
