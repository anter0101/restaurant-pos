import { ApiProperty, OmitType } from '@nestjs/swagger';
import { UserDTO } from './user.dto';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CreateUserDTO extends OmitType(UserDTO, ['id', 'branch'] as const) {
    @ApiProperty({
        type: Number,
        description: 'Assigned branch',
            required: true,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    branchId: number;
}
