import { baseColumns } from 'src/core/utils/base.migration';
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateMenuItemsTable1730870400003 implements MigrationInterface {
  private readonly table = 'menu_items';
  private readonly categoriesTable = 'menu_categories';
  private readonly categoryColumn = 'menu_category_id';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [idColumn, ...otherBaseColumns] = baseColumns;

    await queryRunner.createTable(
      new Table({
        name: this.table,
        columns: [
          idColumn,
          {
            name: this.categoryColumn,
            type: 'int4',
            isNullable: false,
          },
          {
            name: 'name_ar',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'name_en',
            type: 'varchar',
            length: '150',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'default_price',
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
          ...otherBaseColumns,
        ],
      }),
      false,
    );

    await queryRunner.createForeignKey(
      this.table,
      new TableForeignKey({
        columnNames: [this.categoryColumn],
        referencedTableName: this.categoriesTable,
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(this.table);
    const fk = table?.foreignKeys.find((f) =>
      f.columnNames.includes(this.categoryColumn),
    );
    if (fk) {
      await queryRunner.dropForeignKey(this.table, fk);
    }
    await queryRunner.dropTable(this.table, true, true, true);
  }
}
