import { OmitType } from '@nestjs/swagger';
import { MenuCategoryDTO } from './menu-category.dto';

export class CreateMenuCategoryDTO extends OmitType(MenuCategoryDTO, [
  'id',
] as const) {}
