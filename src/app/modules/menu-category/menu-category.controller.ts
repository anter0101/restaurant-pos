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
import { MenuCategoryService } from './menu-category.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, AuthUser } from 'src/core/security';
import { MenuCategoryDTO } from './dtos/menu-category.dto';
import { CreateMenuCategoryDTO } from './dtos/create-menu-category.dto';
import { UserRole } from 'src/core/enums/user-role';
import type { Request } from 'src/core/utils/request';
import { buildSearchQuery, setPaginationHeaders } from 'src/core/utils/search-query.builder';
import { mapMenuCategoryToMenuCategoryDtoSelective } from './menu-category.mapper';
import { UpdateMenuCategoryDTO } from './dtos/update-menu-category.dto';
import { MenuCategory } from './menu-category.entity';
import { MenuCategoryQueryDTO } from './dtos/menu-category-query.dto';
import { User } from '../user/user.entity';
import { ILike } from 'typeorm';

@Controller('menu-categories')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('menu-categories-module')
export class MenuCategoryController {
  logger = new Logger('MenuCategoryController');

  constructor(private readonly menuCategoryService: MenuCategoryService) {}

  private async ensureCategorNameIsUnique(
    nameAr?: string,
    nameEn?: string,
  ): Promise<void> {
    const conditions: { nameAr?: ReturnType<typeof ILike>; nameEn?: ReturnType<typeof ILike> }[] =
      [];
    if (nameAr) {
      conditions.push({ nameAr: ILike(nameAr) });
    }
    if (nameEn) {
      conditions.push({ nameEn: ILike(nameEn) });
    }
    if (!conditions.length) {
      return;
    }

    const duplicate = await this.menuCategoryService.findByFields({
      where: conditions,
    });
    if (duplicate) {
      if (nameAr && duplicate.nameAr.toLowerCase() === nameAr.toLowerCase()) {
        throw new BadRequestException(
          `Menu category with Arabic name ${nameAr} already exists`,
        );
      }
      throw new BadRequestException(
        `Menu category with English name ${nameEn} already exists`,
      );
    }
  }

  @Get('/')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get the list of menu categories paginated' })
  @ApiResponse({
    status: 200,
    description: 'List all menu categories',
    type: MenuCategoryDTO,
    isArray: true,
  })
  async getAllMenuCategories(
    @Req() req: Request,
    @Query() query: MenuCategoryQueryDTO,
  ): Promise<Partial<MenuCategoryDTO>[]> {
    const findOptions = buildSearchQuery<MenuCategory>({
      query,
      searchableColumns: ['nameAr', 'nameEn'],
    });

    const [results, count] =
      await this.menuCategoryService.findAndCount(findOptions);

    setPaginationHeaders(req, count, query);
    return mapMenuCategoryToMenuCategoryDtoSelective(results);
  }

  @Get('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a menu category by id' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully retrieved.',
    type: MenuCategoryDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getMenuCategoryById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MenuCategory> {
    const existing = await this.menuCategoryService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Menu category with id ${id} not found`);
    }
    return existing;
  }

  @Post('/')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new menu category' })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
    type: MenuCategoryDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() dto: CreateMenuCategoryDTO,
    @AuthUser() user: User,
  ): Promise<MenuCategory> {
    await this.ensureCategorNameIsUnique(dto.nameAr ,dto.nameEn);
    return this.menuCategoryService.save(dto, user?.username);
  }

  @Put('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing menu category' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully updated.',
    type: MenuCategoryDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() categoryDTO: UpdateMenuCategoryDTO,
    @AuthUser() user: User,
  ): Promise<UpdateMenuCategoryDTO> {
    const existing = await this.menuCategoryService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Menu category with id ${id} not found`);
    }
    const nameArChanged =
      categoryDTO.nameAr !== undefined &&
      categoryDTO.nameAr !== existing.nameAr;
    const nameEnChanged =
      categoryDTO.nameEn !== undefined &&
      categoryDTO.nameEn !== existing.nameEn;
    if (nameArChanged || nameEnChanged) {
      await this.ensureCategorNameIsUnique(
        nameArChanged ? categoryDTO.nameAr : undefined,
        nameEnChanged ? categoryDTO.nameEn : undefined,
      );
    }
    categoryDTO.id = id;
    return this.menuCategoryService.update(categoryDTO, user?.username);
  }

  @Delete('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a menu category' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const existing = await this.menuCategoryService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Menu category with id ${id} not found`);
    }
    await this.menuCategoryService.delete(existing);
  }
}
