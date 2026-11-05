import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Validate,
  ValidateNested,
} from 'class-validator';
import { createMutuallyExclusivePayloadConstraint } from 'src/core/utils/validators';

/** One branch line under a menu item. */
export class AssignMenuItemBranchEntryDTO {
  @ApiProperty({ example: 1, description: 'Branch id' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  branchId: number;

  @ApiProperty({ example: 15.5, description: 'Branch-specific price' })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** One menu item with its branches (used inside `items` array). */
export class AssignOneMenuItemBranchesDTO {
  @ApiProperty({ example: 1, description: 'Menu item id' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  itemId: number;

  @ApiProperty({ type: [AssignMenuItemBranchEntryDTO] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((b: AssignMenuItemBranchEntryDTO) => b.branchId, {
    message: 'Each branchId must appear only once per menu item',
  })
  @ValidateNested({ each: true })
  @Type(() => AssignMenuItemBranchEntryDTO)
  branches: AssignMenuItemBranchEntryDTO[];
}

type AssignMenuBranchesBulkPayloadLike = {
  itemId?: number;
  branches?: AssignMenuItemBranchEntryDTO[];
  items?: AssignOneMenuItemBranchesDTO[];
};

/** Accept either `{ itemId, branches }` OR `{ items: [...] }`, not both. */
export const AssignMenuBranchesPayloadXorConstraint =
  createMutuallyExclusivePayloadConstraint<AssignMenuBranchesBulkPayloadLike>(
    'assignMenuBranchesXor',
    {
      first: (o) =>
        o.itemId != null &&
        Array.isArray(o.branches) &&
        o.branches.length > 0,
      second: (o) => Array.isArray(o.items) && o.items.length > 0,
    },
    'Provide exactly one of: { itemId, branches } or { items: [{ itemId, branches }] }',
  );

export class AssignMenuItemBranchesBulkDTO {
  @ApiPropertyOptional({ example: 1, description: 'Menu item id (flat shape)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  itemId?: number;

  @ApiPropertyOptional({
    type: [AssignMenuItemBranchEntryDTO],
    description: 'Branches for itemId (flat shape)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((b: AssignMenuItemBranchEntryDTO) => b.branchId, {
    message: 'Each branchId must appear only once',
  })
  @ValidateNested({ each: true })
  @Type(() => AssignMenuItemBranchEntryDTO)
  branches?: AssignMenuItemBranchEntryDTO[];

  @ApiPropertyOptional({
    type: [AssignOneMenuItemBranchesDTO],
    description: 'Multiple menu items; each itemId must appear only once',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((row: AssignOneMenuItemBranchesDTO) => row.itemId, {
    message: 'Each menu item may only appear once in the request',
  })
  @ValidateNested({ each: true })
  @Type(() => AssignOneMenuItemBranchesDTO)
  items?: AssignOneMenuItemBranchesDTO[];

  /**
   * class-validator applies `@Validate` on properties only; the constraint reads the full instance
   * via ValidationArguments.object. Omit from requests.
   */
  @ApiHideProperty()
  @Allow()
  @IsOptional()
  @Validate(AssignMenuBranchesPayloadXorConstraint)
  _mutuallyExclusivePayloadMarker?: unknown;
}

/** Flat row returned after assign / update. */
export class AssignMenuItemBranchDTO {
  @ApiProperty({ example: 1 })
  menuItemId: number;

  @ApiProperty({ example: 1 })
  branchId: number;

  @ApiProperty({ example: 15.5 })
  price: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}
