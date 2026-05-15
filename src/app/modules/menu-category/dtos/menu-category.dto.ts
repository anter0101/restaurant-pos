import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { BaseDTO } from 'src/core/utils/base.dto';

export class MenuCategoryDTO extends BaseDTO {
  @ApiProperty({ example: 'مشروبات', description: 'Category name in Arabic' })
  @IsString()
  @IsNotEmpty()
  nameAr: string;

  @ApiProperty({
    example: 'Beverages',
    description: 'Category name in English',
    required: false,
  })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the category is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
