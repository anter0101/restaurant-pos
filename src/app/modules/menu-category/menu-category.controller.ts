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
import { PageRequest } from 'src/core/utils/pagination.entity';
import { HeaderUtil } from 'src/core/utils/header-util';
import type { Request } from 'src/core/utils/request';
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

  private async ensureCategorNameIsUnique(nameAr: string, nameEn?:string): Promise<void> {

    // or where nameEn is not null and nameEn = name_en or nameAr = name_ar
    const existing = await this.menuCategoryService.findByFields({
      where: [
        { nameAr: nameAr ? ILike(nameAr) : undefined },
        { nameEn: nameEn ? ILike(nameEn) : undefined },
      ],
    });
    if (existing) {
      throw new BadRequestException(`Menu category with name ${nameAr} already exists`);
    }
    if (existing) {
      throw new BadRequestException(`Menu category with name ${nameEn} already exists`);
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
    const pageRequest: PageRequest = new PageRequest(
      +(query.page ?? 1),
      +(query.pageSize ?? 10),
      query.sortField ? `${query.sortField},${query.sortOrder || 'ASC'}` : '',
    );

    const [results, count] = await this.menuCategoryService.findAndCount({
      skip: +pageRequest.page * pageRequest.size,
      take: +pageRequest.size,
      order: pageRequest.sort.asOrder(),
    });

    const categoryDtos =
      mapMenuCategoryToMenuCategoryDtoSelective(results);

    HeaderUtil.addPaginationHeaders(
      req.res!,
      count,
      pageRequest.page,
      count > pageRequest.page * pageRequest.size,
    );

    return categoryDtos;
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
    if (categoryDTO.nameAr !== undefined) {
      await this.ensureCategorNameIsUnique(categoryDTO.nameAr, categoryDTO.nameEn);
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
