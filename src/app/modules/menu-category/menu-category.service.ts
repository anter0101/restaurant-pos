import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuCategory } from './menu-category.entity';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { UpdateMenuCategoryDTO } from './dtos/update-menu-category.dto';
import { CreateMenuCategoryDTO } from './dtos/create-menu-category.dto';
import {
  mapCreateMenuCategoryDtoToEntity,
  mapUpdateMenuCategoryDtoToEntity,
} from './menu-category.mapper';

@Injectable()
export class MenuCategoryService {
  constructor(
    @InjectRepository(MenuCategory)
    private menuCategoryRepository: Repository<MenuCategory>,
  ) {}

  async findById(id: number): Promise<MenuCategory | undefined> {
    const result = await this.menuCategoryRepository.findOne({ where: { id } });
    return result ?? undefined;
  }

  async findByFields(
    options: FindOneOptions<MenuCategory>,
  ): Promise<MenuCategory | undefined> {
    const result = await this.menuCategoryRepository.findOne(options);
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<MenuCategory>,
  ): Promise<[MenuCategory[], number]> {
    return this.menuCategoryRepository.findAndCount(options);
  }

  async save(
    dto: CreateMenuCategoryDTO,
    creator?: string,
  ): Promise<MenuCategory> {
    const category = mapCreateMenuCategoryDtoToEntity(dto);
    if (creator) {
      category.createdBy = creator;
      category.updatedBy = creator;
    }
    return this.menuCategoryRepository.save(category);
  }

  async update(
    categoryDTO: UpdateMenuCategoryDTO,
    updater?: string,
  ): Promise<UpdateMenuCategoryDTO> {
    if (updater) {
      categoryDTO.updatedBy = updater;
    }
    const partial = mapUpdateMenuCategoryDtoToEntity(categoryDTO);
    await this.menuCategoryRepository.update({ id: categoryDTO.id }, partial);
    return categoryDTO;
  }

  async delete(category: MenuCategory): Promise<MenuCategory | undefined> {
    return this.menuCategoryRepository.remove(category);
  }
}
