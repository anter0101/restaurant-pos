import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { MenuItemDTO } from './menu-item.dto';
import { Type } from 'class-transformer';
import { IsArray, ArrayMinSize, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { reLBranchItemDTO } from './create-menu-item.dto';

export class UpdateMenuItemDTO extends PartialType(
  OmitType(MenuItemDTO, ['branchPrice', 'branchRelation'] as const),
) {
  @ApiProperty({
    type: Number,
    description: 'Parent menu category id',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  menuCategoryId?: number;

  @ApiProperty({ type: [reLBranchItemDTO] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => reLBranchItemDTO)
  @IsOptional()
  branches?: reLBranchItemDTO[]; 
} 