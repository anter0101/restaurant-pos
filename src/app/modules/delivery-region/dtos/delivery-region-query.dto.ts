import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';
import { PaginateDTO } from 'src/core/utils/paginate.dto';

export class DeliveryRegionQueryDTO extends PaginateDTO {
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
