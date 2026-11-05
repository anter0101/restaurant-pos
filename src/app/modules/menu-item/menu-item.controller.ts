import {
  Controller,
  Get,
  Logger,
  Query,
  Req,
  UseGuards,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { MenuItemService } from './menu-item.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, AuthUser } from 'src/core/security';
import { MenuItemDTO } from './dtos/menu-item.dto';
import { CreateMenuItemDTO } from './dtos/create-menu-item.dto';
import { UserRole } from 'src/core/enums/user-role';
import type { Request } from 'src/core/utils/request';
import { buildSearchQuery, setPaginationHeaders } from 'src/core/utils/search-query.builder';
import {
  mapMenuItemToMenuItemDtoSelective,
  MENU_ITEM_LIST_SELECT_KEYS,
  mapMenuItemToItemBranchesPricingDto,
  mapRelMenuBranchesToAssignMenuItemBranchDtos,
} from './menu-item.mapper';
import { UpdateMenuItemDTO } from './dtos/update-menu-item.dto';
import { MenuItem } from './menu-item.entity';
import { MenuItemQueryDTO } from './dtos/menu-item-query.dto';
import { User } from '../user/user.entity';
import { MenuCategoryService } from '../menu-category/menu-category.service';
import { BranchService } from '../branch/branch.service';
import { UpdateMenuItemBranchesDTO } from './dtos/update-menu-item-branches.dto';
import {
  AssignMenuItemBranchDTO,
  AssignMenuItemBranchesBulkDTO,
  AssignOneMenuItemBranchesDTO,
} from './dtos/assign-menu-item-branch.dto';
import { MenuItemBranchesPricingResponseDTO } from './dtos/menu-item-with-branch-assignments.dto';
import { FindOptionsWhere } from 'typeorm';

@Controller('menu-items')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('menu-items-module')
export class MenuItemController {
  logger = new Logger('MenuItemController');

  constructor(
    private readonly menuItemService: MenuItemService,
    private readonly menuCategoryService: MenuCategoryService,
    private readonly branchService: BranchService,
  ) {}

  private async ensureMenuItemExists(menuItemId: number): Promise<MenuItem> {
    const item = await this.menuItemService.findById(menuItemId);
    if (!item) {
      throw new NotFoundException(`Menu item with id ${menuItemId} not found`);
    }
    return item;
  }

  private async ensureBranchExists(branchId: number): Promise<void> {
    const branch = await this.branchService.findById(branchId);
    if (!branch) {
      throw new BadRequestException(`Branch with id ${branchId} not found`);
    }
  }

  private resolveAssignBranchGroups(
    dto: AssignMenuItemBranchesBulkDTO,
  ): AssignOneMenuItemBranchesDTO[] {
    if (dto.items?.length) {
      return dto.items;
    }
    return [{ itemId: dto.itemId!, branches: dto.branches! }];
  }

  private async ensureMenuCategoryExists(
    menuCategoryId: number | undefined,
  ): Promise<void> {
    if (menuCategoryId == null) {
      return;
    }
    const category = await this.menuCategoryService.findById(menuCategoryId);
    if (!category) {
      throw new BadRequestException(
        `Menu category with id ${menuCategoryId} not found`,
      );
    }
  }

  private async ensureMenuItemNamesUniqueForCreate(
    nameAr: string,
    nameEn?: string,
  ): Promise<void> {
    const duplicateAr =
      await this.menuItemService.findOtherWithNameAr(nameAr);
    if (duplicateAr) {
      throw new BadRequestException(
        `Menu item with Arabic name ${nameAr} already exists`,
      );
    }
    if (nameEn != null && nameEn !== '') {
      const duplicateEn =
        await this.menuItemService.findOtherWithNameEn(nameEn);
      if (duplicateEn) {
        throw new BadRequestException(
          `Menu item with English name ${nameEn} already exists`,
        );
      }
    }
  }

  private async ensureMenuItemNamesUniqueForUpdate(
    itemId: number,
    itemDTO: UpdateMenuItemDTO,
    existing: MenuItem,
  ): Promise<void> {
    if (
      itemDTO.nameAr !== undefined &&
      itemDTO.nameAr !== existing.nameAr
    ) {
      const duplicateAr = await this.menuItemService.findOtherWithNameAr(
        itemDTO.nameAr,
        itemId,
      );
      if (duplicateAr) {
        throw new BadRequestException(
          `Menu item with Arabic name ${itemDTO.nameAr} already exists`,
        );
      }
    }
    if (
      itemDTO.nameEn !== undefined &&
      itemDTO.nameEn !== existing.nameEn &&
      itemDTO.nameEn !== null &&
      itemDTO.nameEn !== ''
    ) {
      const duplicateEn = await this.menuItemService.findOtherWithNameEn(
        itemDTO.nameEn,
        itemId,
      );
      if (duplicateEn) {
        throw new BadRequestException(
          `Menu item with English name ${itemDTO.nameEn} already exists`,
        );
      }
    }
  }

  @Get('/')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.CASHIER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get the list of menu items paginated',
    description:
      'With query `branchId`, each row includes `branchPrice` and `branchRelation` ({ menuItemId, branchId, price, isActive }) for that assignment. Non-admin users default to their assigned branch.',
  })
  @ApiResponse({
    status: 200,
    description: 'List all menu items',
    type: MenuItemDTO,
    isArray: true,
  })
  async getAllMenuItems(
    @Req() req: Request,
    @Query() query: MenuItemQueryDTO,
    @AuthUser() user: User,
  ): Promise<Partial<MenuItemDTO>[]> {
    const branchId =
      query.branchId ??
      (user.role !== UserRole.ADMIN ? user.branch?.id : undefined);

    if (query.menuCategoryId !== undefined) {
      await this.ensureMenuCategoryExists(query.menuCategoryId);
    }
    if (branchId !== undefined) {
      await this.ensureBranchExists(branchId);
    }

    const where: FindOptionsWhere<MenuItem> = {};
    if (query.menuCategoryId !== undefined) {
      where.category = { id: query.menuCategoryId };
    }
    if (branchId !== undefined) {
      where.branchRelations = { branchId };
    }

    const findOptions = buildSearchQuery<MenuItem>({
      query,
      searchableColumns: ['nameAr', 'nameEn', 'description'],
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: branchId !== undefined ? ['branchRelations'] : [],
    });

    const [results, count] =
      await this.menuItemService.findAndCount(findOptions);

    const itemDtos = mapMenuItemToMenuItemDtoSelective(
      results,
      [...MENU_ITEM_LIST_SELECT_KEYS],
      branchId,
    );

    setPaginationHeaders(req, count, query);
    return itemDtos;
  }

  @Get('/:id/branches')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Menu item + per-branch pricing (nested branch details)',
  })
  @ApiResponse({
    status: 200,
    description:
      '{ menuItem, branches: [{ branch, price, isActive }] }',
    type: MenuItemBranchesPricingResponseDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getMenuItemBranches(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MenuItemBranchesPricingResponseDTO> {
    const menuItem =
      await this.menuItemService.findBranchAssignmentsByMenuItemId(id);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with id ${id} not found`);
    }
    return mapMenuItemToItemBranchesPricingDto(menuItem);
  }

  @Put('/:id/branches')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update branch prices for a menu item (same branch lines as assign)',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated assignments',
    type: AssignMenuItemBranchDTO,
    isArray: true,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async updateMenuItemBranches(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuItemBranchesDTO,
  ): Promise<AssignMenuItemBranchDTO[]> {
    await this.ensureMenuItemExists(id);
    for (const b of dto.branches) {
      await this.ensureBranchExists(b.branchId);
    }
    const rels = await this.menuItemService.updateItemBranchesBulk(
      id,
      dto.branches,
    );
    return mapRelMenuBranchesToAssignMenuItemBranchDtos(rels);
  }

  @Get('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a menu item by id' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully retrieved.',
    type: MenuItemDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getMenuItemById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Partial<MenuItemDTO> | undefined> {
    const existing = await this.menuItemService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Menu item with id ${id} not found`);
    }
    return mapMenuItemToMenuItemDtoSelective(existing);
  }

  @Post('/')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
    type: MenuItemDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() dto: CreateMenuItemDTO,
    @AuthUser() user: User,
  ): Promise<MenuItem> {
    await this.ensureMenuCategoryExists(dto.menuCategoryId);
    await this.ensureMenuItemNamesUniqueForCreate(dto.nameAr, dto.nameEn);

    if (dto.branches?.length) {
      for (const b of dto.branches) {
        await this.ensureBranchExists(b.branchId);
      }
    }

    const item = await this.menuItemService.save(dto, user?.username);

    if (dto.branches?.length) {
      const rels = await this.menuItemService.assignItemToBranchesBulk(
        item.id,
        dto.branches,
      );
      item.branchRelations = rels;
    }

    return item;
  }



  @Post('/assign-branch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Assign menu item(s) to branches ({ itemId, branches } or { items: [...] })',
  })
  @ApiResponse({
    status: 201,
    description: 'Records successfully assigned to branches.',
    type: AssignMenuItemBranchDTO,
    isArray: true,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async assignBranch(
    @Body() dto: AssignMenuItemBranchesBulkDTO,
  ): Promise<AssignMenuItemBranchDTO[]> {
    const groups = this.resolveAssignBranchGroups(dto);
    const out: AssignMenuItemBranchDTO[] = [];

    for (const row of groups) {
      await this.ensureMenuItemExists(row.itemId);
      for (const b of row.branches) {
        await this.ensureBranchExists(b.branchId);
      }

      const rels = await this.menuItemService.assignItemToBranchesBulk(
        row.itemId,
        row.branches,
      );

      out.push(...mapRelMenuBranchesToAssignMenuItemBranchDtos(rels));
    }

    return out;
  }




  @Put('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing menu item' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully updated.',
    type: MenuItemDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() itemDTO: UpdateMenuItemDTO,
    @AuthUser() user: User,
  ): Promise<UpdateMenuItemDTO> {
    const existing = await this.menuItemService.findByFields({
      where: { id },
      relations: ['category'],
    });
    if (!existing) {
      throw new NotFoundException(`Menu item with id ${id} not found`);
    }
    if (
      itemDTO.menuCategoryId !== undefined &&
      itemDTO.menuCategoryId !== existing.category?.id
    ) {
      await this.ensureMenuCategoryExists(itemDTO.menuCategoryId);
    }
    await this.ensureMenuItemNamesUniqueForUpdate(id, itemDTO, existing);

    if (itemDTO.branches?.length) {
      for (const b of itemDTO.branches) {
        await this.ensureBranchExists(b.branchId);
      }
    }

    itemDTO.id = id;
    const result = await this.menuItemService.update(itemDTO, user?.username);

    if (itemDTO.branches?.length) {
      await this.menuItemService.replaceItemBranches(id, itemDTO.branches);
    }

    return result;
  }

  @Delete('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const existing = await this.menuItemService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Menu item with id ${id} not found`);
    }
    await this.menuItemService.delete(existing);
  }

}
