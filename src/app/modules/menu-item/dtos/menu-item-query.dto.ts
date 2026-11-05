import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginateDTO } from 'src/core/utils/paginate.dto';

export class MenuItemQueryDTO extends PaginateDTO {
  @ApiPropertyOptional({
    description:
      'Filter to menu items assigned to this branch; response rows include branchRelation.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Filter to items in this menu category.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  menuCategoryId?: number;
}