/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MenuCategory } from './menu-category.entity';
import { MenuCategoryDTO } from './dtos/menu-category.dto';
import { CreateMenuCategoryDTO } from './dtos/create-menu-category.dto';
import { UpdateMenuCategoryDTO } from './dtos/update-menu-category.dto';
import { BaseDTO } from 'src/core/utils/base.dto';

const allowedMenuCategoryDtoKeys: ReadonlyArray<
  keyof MenuCategoryDTO | keyof BaseDTO
> = [
  'id',
  'nameAr',
  'nameEn',
  'isActive',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

export function mapMenuCategoryToMenuCategoryDtoSelective(
  category: MenuCategory,
  keys?: (keyof MenuCategoryDTO | keyof BaseDTO)[],
): Partial<MenuCategoryDTO>;
export function mapMenuCategoryToMenuCategoryDtoSelective(
  categories: MenuCategory[],
  keys?: (keyof MenuCategoryDTO | keyof BaseDTO)[],
): Partial<MenuCategoryDTO>[];
export function mapMenuCategoryToMenuCategoryDtoSelective(
  categoryOrCategories: MenuCategory | MenuCategory[],
  keys?: (keyof MenuCategoryDTO | keyof BaseDTO)[],
): Partial<MenuCategoryDTO> | Partial<MenuCategoryDTO>[] {
  const mapSingle = (category: MenuCategory): Partial<MenuCategoryDTO> => {
    const dto: Partial<MenuCategoryDTO> = {};

    const keysToMap = (keys || allowedMenuCategoryDtoKeys).filter((key) =>
      allowedMenuCategoryDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in category && category[key as keyof MenuCategory] !== undefined) {
        (dto as any)[key] = category[key as keyof MenuCategory];
      }
    });

    return dto;
  };

  return Array.isArray(categoryOrCategories)
    ? categoryOrCategories.map(mapSingle)
    : mapSingle(categoryOrCategories);
}

export const mapCreateMenuCategoryDtoToEntity = (
  dto: CreateMenuCategoryDTO,
): MenuCategory => {
  const category = new MenuCategory();

  category.nameAr = dto.nameAr;
  if (dto.nameEn !== undefined) category.nameEn = dto.nameEn;
  if (dto.isActive !== undefined) category.isActive = dto.isActive;

  return category;
};

export const mapUpdateMenuCategoryDtoToEntity = (
  dto: UpdateMenuCategoryDTO,
): MenuCategory => {
  const category = new MenuCategory();

  if (dto.id !== undefined) category.id = dto.id;
  if (dto.nameAr !== undefined) category.nameAr = dto.nameAr;
  if (dto.nameEn !== undefined) category.nameEn = dto.nameEn;
  if (dto.isActive !== undefined) category.isActive = dto.isActive;
  if (dto.createdBy !== undefined) category.createdBy = dto.createdBy;
  if (dto.createdAt !== undefined) category.createdAt = dto.createdAt;
  if (dto.updatedBy !== undefined) category.updatedBy = dto.updatedBy;
  if (dto.updatedAt !== undefined) category.updatedAt = dto.updatedAt;
  if (dto.deletedBy !== undefined) category.deletedBy = dto.deletedBy;
  if (dto.deletedAt !== undefined) category.deletedAt = dto.deletedAt;

  return category;
};
