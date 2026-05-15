import { ApiProperty, OmitType } from '@nestjs/swagger';
import { MenuItemDTO } from './menu-item.dto';
import { Type } from 'class-transformer';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateMenuItemDTO extends OmitType(MenuItemDTO, [
  'id',
  'category',
] as const) {
  @ApiProperty({
    type: Number,
    description: 'Parent menu category id',
  })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  menuCategoryId: number;
}
