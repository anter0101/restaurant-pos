import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { DeliveryRegionDTO } from './delivery-region.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDeliveryRegionDTO extends PartialType(
  OmitType(DeliveryRegionDTO, ['branch'] as const),
) {
  @ApiProperty({
    type: Number,
    description: 'Branch ID',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;
  }
