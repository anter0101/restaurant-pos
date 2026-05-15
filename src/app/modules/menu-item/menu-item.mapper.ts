/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MenuItem } from './menu-item.entity';
import { MenuItemDTO } from './dtos/menu-item.dto';
import { CreateMenuItemDTO } from './dtos/create-menu-item.dto';
import { UpdateMenuItemDTO } from './dtos/update-menu-item.dto';
import { BaseDTO } from 'src/core/utils/base.dto';
import { MenuCategory } from '../menu-category/menu-category.entity';
import { mapMenuCategoryToMenuCategoryDtoSelective } from '../menu-category/menu-category.mapper';
import { RelMenuBranch } from './rel-menu-branch.entity';
import { AssignMenuItemBranchDTO } from './dtos/assign-menu-item-branch.dto';
import { MenuItemBranchesPricingResponseDTO } from './dtos/menu-item-with-branch-assignments.dto';
import { BranchDTO } from '../branch/dtos/branch.dto';
import { mapBranchToBranchDtoSelective } from '../branch/branch.mapper';

const allowedMenuItemDtoKeys: ReadonlyArray<keyof MenuItemDTO | keyof BaseDTO> =
  [
    'id',
    'nameAr',
    'nameEn',
    'description',
    'defaultPrice',
    'isActive',
    'category',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'deletedAt',
    'deletedBy',
  ] as const;

export function mapMenuItemToMenuItemDtoSelective(
  item: MenuItem,
  keys?: (keyof MenuItemDTO | keyof BaseDTO)[],
): Partial<MenuItemDTO>;
export function mapMenuItemToMenuItemDtoSelective(
  items: MenuItem[],
  keys?: (keyof MenuItemDTO | keyof BaseDTO)[],
): Partial<MenuItemDTO>[];
export function mapMenuItemToMenuItemDtoSelective(
  itemOrItems: MenuItem | MenuItem[],
  keys?: (keyof MenuItemDTO | keyof BaseDTO)[],
): Partial<MenuItemDTO> | Partial<MenuItemDTO>[] {
  const mapSingle = (item: MenuItem): Partial<MenuItemDTO> => {
    const dto: Partial<MenuItemDTO> = {};

    const keysToMap = (keys || allowedMenuItemDtoKeys).filter((key) =>
      allowedMenuItemDtoKeys.includes(key),
    );

    keysToMap.forEach((key) => {
      if (key in item && item[key as keyof MenuItem] !== undefined) {
        (dto as any)[key] = item[key as keyof MenuItem];
      }
      if (key === 'category' && item.category) {
        (dto as any)[key] = mapMenuCategoryToMenuCategoryDtoSelective(
          item.category,
        );
      }
    });

    return dto;
  };

  return Array.isArray(itemOrItems)
    ? itemOrItems.map(mapSingle)
    : mapSingle(itemOrItems);
}

export const mapCreateMenuItemDtoToEntity = (dto: CreateMenuItemDTO): MenuItem => {
  const item = new MenuItem();

  item.nameAr = dto.nameAr;
  item.defaultPrice = dto.defaultPrice;
  if (dto.nameEn !== undefined) item.nameEn = dto.nameEn;
  if (dto.description !== undefined) item.description = dto.description;
  if (dto.isActive !== undefined) item.isActive = dto.isActive;

  const category = new MenuCategory();
  category.id = dto.menuCategoryId;
  item.category = category;

  return item;
};

export const mapUpdateMenuItemDtoToEntity = (dto: UpdateMenuItemDTO): MenuItem => {
  const item = new MenuItem();

  if (dto.id !== undefined) item.id = dto.id;
  if (dto.nameAr !== undefined) item.nameAr = dto.nameAr;
  if (dto.nameEn !== undefined) item.nameEn = dto.nameEn;
  if (dto.description !== undefined) item.description = dto.description;
  if (dto.defaultPrice !== undefined) item.defaultPrice = dto.defaultPrice;
  if (dto.isActive !== undefined) item.isActive = dto.isActive;
  if (dto.menuCategoryId !== undefined) {
    const category = new MenuCategory();
    category.id = dto.menuCategoryId;
    item.category = category;
  }
  if (dto.createdBy !== undefined) item.createdBy = dto.createdBy;
  if (dto.createdAt !== undefined) item.createdAt = dto.createdAt;
  if (dto.updatedBy !== undefined) item.updatedBy = dto.updatedBy;
  if (dto.updatedAt !== undefined) item.updatedAt = dto.updatedAt;
  if (dto.deletedBy !== undefined) item.deletedBy = dto.deletedBy;
  if (dto.deletedAt !== undefined) item.deletedAt = dto.deletedAt;

  return item;
};

export const mapRelMenuBranchToAssignMenuItemBranchDto = (
  rel: RelMenuBranch,
): AssignMenuItemBranchDTO => ({
  menuItemId: rel.menuItemId,
  branchId: rel.branchId,
  price: Number(rel.price),
  isActive: rel.isActive,
});

export const mapRelMenuBranchesToAssignMenuItemBranchDtos = (
  rels: RelMenuBranch[],
): AssignMenuItemBranchDTO[] =>
  rels.map(mapRelMenuBranchToAssignMenuItemBranchDto);

export const mapMenuItemToItemBranchesPricingDto = (
  menuItem: MenuItem,
): MenuItemBranchesPricingResponseDTO => ({
  menuItem: mapMenuItemToMenuItemDtoSelective(menuItem) as MenuItemDTO,
  branches: [...(menuItem.branchRelations ?? [])]
    .sort((a, b) => a.branchId - b.branchId)
    .map((rel) => ({
      branch: mapBranchToBranchDtoSelective(rel.branch) as BranchDTO,
      price: Number(rel.price),
      isActive: rel.isActive,
    })),
});
