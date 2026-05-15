import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDTO } from 'src/core/utils/base.dto';
import { MenuCategoryDTO } from '../../menu-category/dtos/menu-category.dto';
import { AssignMenuItemBranchDTO } from './assign-menu-item-branch.dto';

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

  @ApiPropertyOptional({
    example: 15.5,
    description:
      'Price for the requested branch (only returned when listing with query param `branchId`)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchPrice?: number;

  @ApiPropertyOptional({
    type: () => AssignMenuItemBranchDTO,
    description:
      'Flat assignment DTO for the requested branch (`menuItemId`, `branchId`, `price`, `isActive`) when listing with `branchId`',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignMenuItemBranchDTO)
  branchRelation?: AssignMenuItemBranchDTO;
}
