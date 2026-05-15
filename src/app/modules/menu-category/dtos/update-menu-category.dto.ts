import { PartialType } from '@nestjs/swagger';
import { MenuCategoryDTO } from './menu-category.dto';

export class UpdateMenuCategoryDTO extends PartialType(MenuCategoryDTO) {}
