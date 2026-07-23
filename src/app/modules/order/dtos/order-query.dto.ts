import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PaginateDTO } from 'src/core/utils/paginate.dto';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';

export class OrderQueryDTO extends PaginateDTO {
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
