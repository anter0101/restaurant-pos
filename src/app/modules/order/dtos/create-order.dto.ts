import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateOrderItemInputDTO {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  menuItemId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDTO {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  branchId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryRegionId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  shiftManagementId?: number;

  @ApiProperty({ type: [CreateOrderItemInputDTO] })
  @IsNotEmpty()
  items: CreateOrderItemInputDTO[];
}
