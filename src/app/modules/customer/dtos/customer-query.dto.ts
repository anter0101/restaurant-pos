import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginateDTO } from 'src/core/utils/paginate.dto';
import { CustomerType } from 'src/core/enums/customer-type';

export class CustomerQueryDTO extends PaginateDTO {
  @ApiProperty({ enum: CustomerType, required: false })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;
  
  phoneNumber?: string;
}
