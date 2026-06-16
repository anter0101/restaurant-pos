import { ApiProperty, OmitType } from '@nestjs/swagger';
import { DeliveryRegionDTO } from './delivery-region.dto';
import { IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDeliveryRegionDTO extends OmitType(DeliveryRegionDTO, [
  'id',
  'branch',
] as const) {
  @ApiProperty({
    type: Number,
    description: 'Branch ID',
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId: number;
}
