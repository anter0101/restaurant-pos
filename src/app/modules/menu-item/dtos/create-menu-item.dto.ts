import { ApiProperty, OmitType } from '@nestjs/swagger';
import { MenuItemDTO } from './menu-item.dto';
import { Type } from 'class-transformer';
import { IsNumber, IsNotEmpty, ValidateNested, ArrayMinSize, IsArray, IsOptional } from 'class-validator';


export class  reLBranchItemDTO {
  @ApiProperty({ example: 1 })
  branchId: number;

  @ApiProperty({ example: 15.5 })
  price: number;

  @ApiProperty({ example: true })
  isActive: boolean;
} 

export class CreateMenuItemDTO extends OmitType(MenuItemDTO, [
  'id',
  'category',
  'branchPrice',
  'branchRelation',
] as const) {
  @ApiProperty({
    type: Number,
    description: 'Parent menu category id',
  })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  menuCategoryId: number;


  @ApiProperty({ type: [reLBranchItemDTO] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => reLBranchItemDTO)
  @IsOptional()
  branches?: reLBranchItemDTO[];


}


