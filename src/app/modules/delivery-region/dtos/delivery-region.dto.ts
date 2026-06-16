import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDTO } from 'src/core/utils/base.dto';
import { BranchDTO } from '../../branch/dtos/branch.dto';

export class DeliveryRegionDTO extends BaseDTO {
  @ApiProperty({
    type: BranchDTO,
    description: 'Branch this region belongs to',
    required: false,
  })
  @IsOptional()
  @Type(() => BranchDTO)
  branch?: BranchDTO;

  @ApiProperty({ example: 'Downtown' })
  @IsString()
  @IsNotEmpty()
  regionName: string;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  @Min(0)
  deliveryPrice: number;
}
