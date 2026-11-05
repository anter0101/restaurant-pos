import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { AssignMenuItemBranchEntryDTO } from './assign-menu-item-branch.dto';

/** Body for `PUT /menu-items/:id/branches` — same branch line shape as assign (flat `{ branches }`). */
export class UpdateMenuItemBranchesDTO {
  @ApiProperty({ type: [AssignMenuItemBranchEntryDTO] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((b: AssignMenuItemBranchEntryDTO) => b.branchId, {
    message: 'Each branchId must appear only once',
  })
  @ValidateNested({ each: true })
  @Type(() => AssignMenuItemBranchEntryDTO)
  branches: AssignMenuItemBranchEntryDTO[];
}
