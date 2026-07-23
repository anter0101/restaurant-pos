import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderType } from 'src/core/enums/order-type';

export class CreateOrderItemInputDTO {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  menuItemId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 12.5,
    description: 'Unit price shown on POS — validated against branch menu price',
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateOrderDTO {
  @ApiProperty({ enum: OrderType, example: OrderType.DINE_IN })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Required when orderType is DELIVERY',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryRegionId?: number;

  @ApiProperty({
    example: 37.5,
    description: 'Sum of line totals — must match server calculation',
  })
  @IsNumber()
  @Min(0)
  itemsSubtotal: number;

  @ApiProperty({ example: 0, description: 'Delivery fee from region (0 unless DELIVERY)' })
  @IsNumber()
  @Min(0)
  deliveryFees: number;

  @ApiProperty({ example: 3.75, description: 'Service fee (DINE_IN only, else 0)' })
  @IsNumber()
  @Min(0)
  serviceFee: number;

  @ApiProperty({ example: 41.25, description: 'Grand total — must match server calculation' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ type: [CreateOrderItemInputDTO] })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInputDTO)
  items: CreateOrderItemInputDTO[];
}
