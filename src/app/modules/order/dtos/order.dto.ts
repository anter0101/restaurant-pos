import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BaseDTO } from 'src/core/utils/base.dto';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { BranchDTO } from '../../branch/dtos/branch.dto';

export class OrderItemDTO extends BaseDTO {
  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 'قهوة' })
  menuItemNameAr: string;

  @ApiProperty({ example: 'Coffee' })
  menuItemNameEn: string;
}

export class OrderDTO extends BaseDTO {
  @ApiProperty({ type: BranchDTO, required: false })
  @IsOptional()
  @Type(() => BranchDTO)
  branch?: BranchDTO;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({ example: 0 })
  @IsNumber()
  orderQueue: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  itemsSubtotal: number;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  deliveryFees: number;

  @ApiProperty({
    example: 'شارع الجلاء عمارة 5',
    required: false,
    description: 'Snapshot of delivery address (DELIVERY orders only)',
  })
  @IsOptional()
  deliveryAddress?: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  serviceFee: number;

  @ApiProperty({ example: 49.5 })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ type: [OrderItemDTO], required: false })
  @IsOptional()
  @Type(() => OrderItemDTO)
  items?: OrderItemDTO[];
}
