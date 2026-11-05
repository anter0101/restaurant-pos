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

export type MenuItemDtoSelectableKey = keyof MenuItemDTO | keyof BaseDTO;

/** Fields copied from `MenuItem` entity (excludes synthetic branch projection keys). */
const ENTITY_MENU_ITEM_MAP_KEYS = [
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
] as const satisfies readonly MenuItemDtoSelectableKey[];

/** Derived only when `branchId` is passed and relation rows are loaded. */
const SYNTHETIC_BRANCH_KEYS = ['branchPrice', 'branchRelation'] as const;

const ALL_SELECTABLE_MENU_ITEM_KEYS = [
  ...ENTITY_MENU_ITEM_MAP_KEYS,
  ...SYNTHETIC_BRANCH_KEYS,
] as const satisfies readonly MenuItemDtoSelectableKey[];

/** Default list projection used by GET /menu-items (keep in sync with controller). */
export const MENU_ITEM_LIST_SELECT_KEYS = [
  'id',
  'nameAr',
  'nameEn',
  'description',
  'defaultPrice',
  'branchPrice',
  'isActive',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const satisfies readonly MenuItemDtoSelectableKey[];

function resolveBranchFilterId(
  branchId?: number | string | null,
): number | undefined {
  if (
    branchId === undefined ||
    branchId === null ||
    (typeof branchId === 'string' && branchId.trim() === '')
  ) {
    return undefined;
  }
  const bid = Number(branchId);
  return Number.isNaN(bid) ? undefined : bid;
}

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

export function mapMenuItemToMenuItemDtoSelective(
  item: MenuItem,
  keys?: MenuItemDtoSelectableKey[],
  branchId?: number | string | null,
): Partial<MenuItemDTO>;
export function mapMenuItemToMenuItemDtoSelective(
  items: MenuItem[],
  keys?: MenuItemDtoSelectableKey[],
  branchId?: number | string | null,
): Partial<MenuItemDTO>[];
export function mapMenuItemToMenuItemDtoSelective(
  itemOrItems: MenuItem | MenuItem[],
  keys?: MenuItemDtoSelectableKey[],
  branchId?: number | string | null,
): Partial<MenuItemDTO> | Partial<MenuItemDTO>[] {
  const mapSingle = (item: MenuItem): Partial<MenuItemDTO> => {
    const dto: Partial<MenuItemDTO> = {};

    const explicitKeys = keys !== undefined;
    const keysResolved = (
      explicitKeys ? keys : [...ENTITY_MENU_ITEM_MAP_KEYS]
    ).filter((key) =>
      (ALL_SELECTABLE_MENU_ITEM_KEYS as readonly string[]).includes(key),
    );

    const wantsBranchPrice =
      !explicitKeys || keysResolved.includes('branchPrice');
    const wantsBranchRelation =
      !explicitKeys || keysResolved.includes('branchRelation');

    keysResolved.forEach((key) => {
      if (key === 'branchPrice' || key === 'branchRelation') {
        return;
      }
      if (key === 'category') {
        if (item.category) {
          (dto as any)[key] = mapMenuCategoryToMenuCategoryDtoSelective(
            item.category,
          );
        }
        return;
      }
      if (key in item && item[key as keyof MenuItem] !== undefined) {
        (dto as any)[key] = item[key as keyof MenuItem];
      }
    });

    const bid = resolveBranchFilterId(branchId);
    if (
      bid !== undefined &&
      (wantsBranchPrice || wantsBranchRelation)
    ) {
      const rel = item.branchRelations?.find(
        (r) => Number(r.branchId) === bid,
      );
      if (rel) {
        if (wantsBranchPrice) {
          dto.branchPrice = Number(rel.price);
        }
        if (wantsBranchRelation) {
          dto.branchRelation = mapRelMenuBranchToAssignMenuItemBranchDto(rel);
        }
      }
    }

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
