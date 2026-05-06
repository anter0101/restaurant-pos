import { PartialType } from '@nestjs/swagger';
import { BranchDTO } from './branch.dto';

export class UpdateBranchDTO extends PartialType(BranchDTO) {}
