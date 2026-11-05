import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, Validate } from 'class-validator';
import { PaginateDTO } from 'src/core/utils/paginate.dto';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { DateRangeWindowConstraint } from 'src/core/utils/date-range';

export class OrderQueryDTO extends PaginateDTO {
  @ApiProperty({
    required: false,
    example: '2026-10-01T00:00:00.000Z',
    description: 'Filter orders whose createdAt is >= from (inclusive)',
  })
  @Validate(DateRangeWindowConstraint)
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    required: false,
    example: '2026-10-31T23:59:59.999Z',
    description: 'Filter orders whose createdAt is <= to (inclusive)',
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
  shiftId?: number;

  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiProperty({ enum: OrderStatus, required: false })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ enum: OrderType, required: false })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;
}
