import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDTO } from 'src/core/utils/base.dto';
import { MenuCategoryDTO } from '../../menu-category/dtos/menu-category.dto';

export class MenuItemDTO extends BaseDTO {
  @ApiProperty({ example: 'قهوة', description: 'Item name in Arabic' })
  @IsString()
  @IsNotEmpty()
  nameAr: string;

  @ApiProperty({
    example: 'Coffee',
    description: 'Item name in English',
    required: false,
  })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({
    example: 'Hot espresso drink',
    description: 'Item description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12.5, description: 'Global default price' })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  defaultPrice: number;

  @ApiProperty({
    example: true,
    description: 'Whether the item is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    type: MenuCategoryDTO,
    description: 'Parent menu category',
    required: false,
  })
  @IsOptional()
  @Type(() => MenuCategoryDTO)
  category?: MenuCategoryDTO;
}
