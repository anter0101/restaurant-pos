import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from 'src/app/modules/branch/branch.entity';
import { MenuCategory } from 'src/app/modules/menu-category/menu-category.entity';
import { MenuItem } from 'src/app/modules/menu-item/menu-item.entity';
import { RelMenuBranch } from 'src/app/modules/menu-item/rel-menu-branch.entity';
import { mapCreateMenuItemDtoToEntity } from 'src/app/modules/menu-item/menu-item.mapper';
import {
  khataamBranches,
  khataamCategories,
  khataamMenuItems,
} from './data';

const CREATOR = 'khataam-seeder';

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

@Injectable()
export class KhataamSeederService {
  private readonly logger = new Logger(KhataamSeederService.name);

  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(MenuCategory)
    private readonly categoryRepository: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(RelMenuBranch)
    private readonly relMenuBranchRepository: Repository<RelMenuBranch>,
  ) {}

  async seed(): Promise<void> {
    await this.cleanupLegacySuffixedRows();

    const branchIdByName = await this.seedBranches();
    const categoryIdByNameAr = await this.seedCategories();

    let itemsCreated = 0;
    let relsInserted = 0;
    let relsUpdated = 0;
    let skippedUnknownCategory = 0;
    let skippedUnknownBranch = 0;
    const desiredRelKeys = new Set<string>();

    for (const item of khataamMenuItems) {
      const categoryId = categoryIdByNameAr.get(item.categoryNameAr);
      if (!categoryId) {
        this.logger.warn(
          `Skipping item with unknown category: ${item.nameAr} → ${item.categoryNameAr}`,
        );
        skippedUnknownCategory++;
        continue;
      }

      const nameAr = truncate(item.nameAr, 150);
      const nameEn = item.nameEn ? truncate(item.nameEn, 150) : undefined;

      let menuItem = await this.menuItemRepository.findOne({
        where: { nameAr, category: { id: categoryId } },
        relations: ['category'],
      });
      if (!menuItem) {
        const entity = mapCreateMenuItemDtoToEntity({
          menuCategoryId: categoryId,
          nameAr,
          nameEn,
          defaultPrice: item.defaultPrice,
          isActive: true,
        });
        entity.createdBy = CREATOR;
        entity.updatedBy = CREATOR;
        menuItem = await this.menuItemRepository.save(entity);
        itemsCreated++;
      } else if (!menuItem.nameEn && nameEn) {
        // Back-fill English name when the row was created by an earlier (untranslated) run.
        menuItem.nameEn = nameEn;
        menuItem.updatedBy = CREATOR;
        menuItem = await this.menuItemRepository.save(menuItem);
      }

      for (const bp of item.branchPrices) {
        const branchId = branchIdByName.get(bp.branchName);
        if (branchId === undefined) {
          this.logger.warn(
            `Skipping pricing for unknown branch "${bp.branchName}" on item ${item.nameAr}`,
          );
          skippedUnknownBranch++;
          continue;
        }
        desiredRelKeys.add(`${menuItem.id}:${branchId}`);
        const status = await this.ensureRel(menuItem.id, branchId, bp.price);
        if (status === 'inserted') relsInserted++;
        else if (status === 'updated') relsUpdated++;
      }
    }

    const relsDeleted = await this.pruneOrphanRels(desiredRelKeys);

    this.logger.debug(
      `Khataam seed done: branches=${branchIdByName.size}, categories=${categoryIdByNameAr.size}, ` +
        `new menu_items=${itemsCreated}, new rel_menu_branches=${relsInserted}, ` +
        `repriced rel_menu_branches=${relsUpdated}, pruned orphan rel_menu_branches=${relsDeleted}` +
        (skippedUnknownCategory
          ? `, skipped items (unknown category)=${skippedUnknownCategory}`
          : '') +
        (skippedUnknownBranch
          ? `, skipped pricing (unknown branch)=${skippedUnknownBranch}`
          : ''),
    );
  }

  /**
   * Remove `rel_menu_branches` rows that exist in the DB but aren't expressed in
   * `data.ts`. Scoped to menu_items created by this seeder so user/manual rows
   * are untouched.
   */
  private async pruneOrphanRels(
    desiredKeys: Set<string>,
  ): Promise<number> {
    const existing = await this.relMenuBranchRepository
      .createQueryBuilder('r')
      .innerJoin(MenuItem, 'mi', 'mi.id = r.menu_item_id')
      .where('mi.created_by = :creator', { creator: CREATOR })
      .select(['r.menu_item_id AS "menuItemId"', 'r.branch_id AS "branchId"'])
      .getRawMany<{ menuItemId: number; branchId: number }>();

    const orphans = existing.filter(
      (e) => !desiredKeys.has(`${e.menuItemId}:${e.branchId}`),
    );
    if (!orphans.length) return 0;

    for (const o of orphans) {
      await this.relMenuBranchRepository.delete({
        menuItemId: o.menuItemId,
        branchId: o.branchId,
      });
    }
    return orphans.length;
  }

  private async seedBranches(): Promise<Map<string, number>> {
    const idByName = new Map<string, number>();
    for (const b of khataamBranches) {
      let branch = await this.branchRepository.findOne({
        where: { name: b.name },
      });
      if (!branch) {
        branch = await this.branchRepository.save({
          name: b.name,
          type: b.type,
          address: b.address,
          phone: b.phone,
          createdBy: CREATOR,
          updatedBy: CREATOR,
        });
        this.logger.debug(`Created branch ${b.name} (id ${branch.id})`);
      } else {
        branch.address = b.address;
        if (b.phone !== undefined) branch.phone = b.phone;
        branch.updatedBy = CREATOR;
        await this.branchRepository.save(branch);
      }
      idByName.set(b.name, branch.id);
    }
    return idByName;
  }

  private async seedCategories(): Promise<Map<string, number>> {
    const idByNameAr = new Map<string, number>();
    for (const c of khataamCategories) {
      const nameAr = truncate(c.nameAr, 100);
      const nameEn = c.nameEn ? truncate(c.nameEn, 100) : undefined;

      let row = await this.categoryRepository.findOne({ where: { nameAr } });
      if (!row) {
        row = await this.categoryRepository.save({
          nameAr,
          nameEn,
          isActive: true,
          createdBy: CREATOR,
          updatedBy: CREATOR,
        });
      } else if (!row.nameEn && nameEn) {
        // Back-fill English name when the row exists from an earlier (untranslated) run.
        row.nameEn = nameEn;
        row.updatedBy = CREATOR;
        row = await this.categoryRepository.save(row);
      }
      idByNameAr.set(c.nameAr, row.id);
    }
    return idByNameAr;
  }

  /** @returns 'inserted' if new, 'updated' if price changed, 'unchanged' otherwise. */
  private async ensureRel(
    menuItemId: number,
    branchId: number,
    price: number,
  ): Promise<'inserted' | 'updated' | 'unchanged'> {
    const existing = await this.relMenuBranchRepository.findOne({
      where: { menuItemId, branchId },
    });
    if (existing) {
      if (Number(existing.price) !== Number(price)) {
        existing.price = price;
        await this.relMenuBranchRepository.save(existing);
        return 'updated';
      }
      return 'unchanged';
    }
    await this.relMenuBranchRepository.save({
      menuItemId,
      branchId,
      price,
      isActive: true,
    });
    return 'inserted';
  }

  /**
   * One-shot purge of rows created by an earlier draft of this seeder that
   * suffixed category `nameAr` with the region label (e.g. `الفول (شبين الكوم)`).
   * Deleting the categories cascades to menu_items → rel_menu_branches.
   */
  private async cleanupLegacySuffixedRows(): Promise<void> {
    const result = await this.categoryRepository
      .createQueryBuilder()
      .delete()
      .from(MenuCategory)
      .where('created_by = :creator', { creator: CREATOR })
      .andWhere(`name_ar LIKE '% (%'`)
      .execute();

    if (result.affected) {
      this.logger.debug(
        `Removed ${result.affected} legacy suffixed Khataam categor${
          result.affected === 1 ? 'y' : 'ies'
        } (cascaded to items + rels).`,
      );
    }
  }
}
