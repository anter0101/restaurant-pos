import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateRelMenuBranchesTable1730870400004
  implements MigrationInterface
{
  private readonly table = 'rel_menu_branches';
  private readonly branchesTable = 'branches';
  private readonly menuItemsTable = 'menu_items';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: this.table,
        columns: [
          {
            name: 'branch_id',
            type: 'int4',
            isPrimary: true,
          },
          {
            name: 'menu_item_id',
            type: 'int4',
            isPrimary: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
        ],
      }),
      false,
    );

    await queryRunner.createForeignKey(
      this.table,
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedTableName: this.branchesTable,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      this.table,
      new TableForeignKey({
        columnNames: ['menu_item_id'],
        referencedTableName: this.menuItemsTable,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(this.table);
    if (table) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey(this.table, fk);
      }
    }
    await queryRunner.dropTable(this.table, true, true, true);
  }
}
