import { ApiProperty, PartialType } from '@nestjs/swagger';
import { UserDTO } from './user.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDTO extends PartialType(UserDTO) {
    @ApiProperty({
        type: Number,
        description: 'Assigned branch',
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    branchId: number;
}
