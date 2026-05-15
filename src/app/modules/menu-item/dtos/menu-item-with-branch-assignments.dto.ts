import { ApiProperty } from '@nestjs/swagger';

/** One row under `branches` in GET /menu-items/:id/branches (matches assign flat body lines). */
export class MenuItemBranchPricingRowDTO {
  @ApiProperty({ example: 1 })
  branchId: number;

  @ApiProperty({ example: 15.5 })
  price: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

/** Same shape as assign body: `{ itemId, branches: [{ branchId, price, isActive }] }`. */
export class MenuItemBranchesPricingResponseDTO {
  @ApiProperty({ example: 1 })
  itemId: number;

  @ApiProperty({ type: [MenuItemBranchPricingRowDTO] })
  branches: MenuItemBranchPricingRowDTO[];
}
