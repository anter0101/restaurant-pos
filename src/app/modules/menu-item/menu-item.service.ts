import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuItem } from './menu-item.entity';
import { RelMenuBranch } from './rel-menu-branch.entity';
import { FindManyOptions, FindOneOptions, In, Repository } from 'typeorm';
import { UpdateMenuItemDTO } from './dtos/update-menu-item.dto';
import { CreateMenuItemDTO } from './dtos/create-menu-item.dto';
import {
  mapCreateMenuItemDtoToEntity,
  mapUpdateMenuItemDtoToEntity,
} from './menu-item.mapper';
import { AssignMenuItemBranchEntryDTO } from './dtos/assign-menu-item-branch.dto';

@Injectable()
export class MenuItemService {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    @InjectRepository(RelMenuBranch)
    private relMenuBranchRepository: Repository<RelMenuBranch>,
  ) {}

  async findById(id: number): Promise<MenuItem | undefined> {
    const result = await this.menuItemRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    return result ?? undefined;
  }

  async findByFields(
    options: FindOneOptions<MenuItem>,
  ): Promise<MenuItem | undefined> {
    const result = await this.menuItemRepository.findOne(options);
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<MenuItem>,
  ): Promise<[MenuItem[], number]> {
    return this.menuItemRepository.findAndCount(options);
  }

  async save(dto: CreateMenuItemDTO, creator?: string): Promise<MenuItem> {
    const item = mapCreateMenuItemDtoToEntity(dto);
    if (creator) {
      item.createdBy = creator;
      item.updatedBy = creator;
    }
    return this.menuItemRepository.save(item);
  }

  async update(
    itemDTO: UpdateMenuItemDTO,
    updater?: string,
  ): Promise<UpdateMenuItemDTO> {
    if (updater) {
      itemDTO.updatedBy = updater;
    }
    const partial = mapUpdateMenuItemDtoToEntity(itemDTO);
    await this.menuItemRepository.update({ id: itemDTO.id }, partial);
    return itemDTO;
  }

  async delete(item: MenuItem): Promise<MenuItem | undefined> {
    return this.menuItemRepository.remove(item);
  }


  async assignItemToBranchesBulk(
    itemId: number,
    branches: AssignMenuItemBranchEntryDTO[],
  ): Promise<RelMenuBranch[]> {
    if (!branches.length) {
      throw new BadRequestException('At least one branch is required');
    }

    const branchIds = branches.map((b) => b.branchId);
    if (new Set(branchIds).size !== branchIds.length) {
      throw new BadRequestException('Duplicate branchId in request');
    }

    const existing = await this.relMenuBranchRepository.find({
      where: branches.map((b) => ({
        menuItemId: itemId,
        branchId: b.branchId,
      })),
    });
    if (existing.length > 0) {
      throw new BadRequestException(
        `Already assigned: ${existing.map((e) => `item ${e.menuItemId} → branch ${e.branchId}`).join(', ')}`,
      );
    }

    const entities = branches.map((b) => {
      const rel = new RelMenuBranch();
      rel.menuItemId = itemId;
      rel.branchId = b.branchId;
      rel.price = b.price;
      rel.isActive = b.isActive ?? true;
      return rel;
    });

    return this.relMenuBranchRepository.save(entities);
  }

  async findBranchAssignmentsByMenuItemId(
    menuItemId: number,
  ): Promise<MenuItem | null> {
    return this.menuItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.branchRelations', 'rel')
      .where('item.id = :menuItemId', { menuItemId })
      .orderBy('rel.branch_id', 'ASC')
      .getOne();
  }

  async updateItemBranchesBulk(
    itemId: number,
    branches: AssignMenuItemBranchEntryDTO[],
  ): Promise<RelMenuBranch[]> {
    if (!branches.length) {
      throw new BadRequestException('At least one branch is required');
    }

    const branchIds = branches.map((b) => b.branchId);
    if (new Set(branchIds).size !== branchIds.length) {
      throw new BadRequestException('Duplicate branchId in request');
    }

    const existing = await this.relMenuBranchRepository.find({
      where: { menuItemId: itemId, branchId: In(branchIds) },
    });

    if (existing.length !== branchIds.length) {
      const found = new Set(existing.map((e) => e.branchId));
      const missing = branchIds.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Menu item ${itemId} is not assigned to branches: ${missing.join(', ')}`,
      );
    }

    const byBranchId = new Map(existing.map((e) => [e.branchId, e]));
    for (const b of branches) {
      const rel = byBranchId.get(b.branchId)!;
      rel.price = b.price;
      if (b.isActive !== undefined) {
        rel.isActive = b.isActive;
      }
    }

    return this.relMenuBranchRepository.save(existing);
  }
}
