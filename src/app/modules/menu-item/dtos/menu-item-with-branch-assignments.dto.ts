import { ApiProperty } from '@nestjs/swagger';
import { BranchDTO } from '../../branch/dtos/branch.dto';
import { MenuItemDTO } from './menu-item.dto';

/** One row under `branches` in GET /menu-items/:id/branches (price flags per branch; branch is hydrated). */
export class MenuItemBranchPricingRowDTO {
  @ApiProperty({ example: 1 })
  branch: BranchDTO;

  @ApiProperty({ example: 15.5 })
  price: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

/** GET response: `{ menuItem, branches: [{ branch, price, isActive }] }`. */
export class MenuItemBranchesPricingResponseDTO {
  @ApiProperty({ example: 1 })
  menuItem: MenuItemDTO;

  @ApiProperty({ type: [MenuItemBranchPricingRowDTO] })
  branches: MenuItemBranchPricingRowDTO[];
}
