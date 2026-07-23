import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BaseDTO } from 'src/core/utils/base.dto';
import { CustomerType } from 'src/core/enums/customer-type';
import { DeliveryRegionDTO } from '../../delivery-region/dtos/delivery-region.dto';

export class CustomerDTO extends BaseDTO {
  @ApiProperty({ example: 'محمد' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false, example: '01098765432' })
  @IsOptional()
  @IsString()
  alternativePhone?: string;

  @ApiProperty({ required: false, example: 'شارع الجلاء' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ enum: CustomerType })
  @IsEnum(CustomerType)
  customerType: CustomerType;

  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  defaultDeliveryRegionId?: number;

  @ApiProperty({ type: DeliveryRegionDTO, required: false })
  @IsOptional()
  @Type(() => DeliveryRegionDTO)
  defaultDeliveryRegion?: Partial<DeliveryRegionDTO>;
}
