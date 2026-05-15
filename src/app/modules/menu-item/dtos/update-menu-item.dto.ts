import { ApiProperty, PartialType } from '@nestjs/swagger';
import { MenuItemDTO } from './menu-item.dto';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateMenuItemDTO extends PartialType(MenuItemDTO) {
  @ApiProperty({
    type: Number,
    description: 'Parent menu category id',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  menuCategoryId?: number;
}
