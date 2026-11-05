import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BaseDTO } from 'src/core/utils/base.dto';
import { CustomerType } from 'src/core/enums/customer-type';

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

  @ApiProperty({ required: false, example: 'شارع النصر' })
  @IsOptional()
  @IsString()
  secondaryAddress?: string;

  @ApiProperty({ required: false, example: 'شارع المعادي' })
  @IsOptional()
  @IsString()
  thirdAddress?: string;

  @ApiProperty({ enum: CustomerType })
  @IsEnum(CustomerType)
  customerType: CustomerType;
}
