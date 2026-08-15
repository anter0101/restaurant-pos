import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class RemoveDefaultDeliveryRegionFromCustomers1730870400021
  implements MigrationInterface
{
  private readonly table = 'customers';
  private readonly column = 'default_delivery_region_id';
  private readonly referencedTable = 'delivery_regions';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const customersTable = await queryRunner.getTable(this.table);
    const foreignKey = customersTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes(this.column),
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey(this.table, foreignKey);
    }

    const hasColumn = customersTable?.columns.some(
      (col) => col.name === this.column,
    );
    if (hasColumn) {
      await queryRunner.dropColumn(this.table, this.column);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const customersTable = await queryRunner.getTable(this.table);
    const hasColumn = customersTable?.columns.some(
      (col) => col.name === this.column,
    );
    if (!hasColumn) {
      await queryRunner.addColumn(
        this.table,
        new TableColumn({
          name: this.column,
          type: 'int4',
          isNullable: true,
        }),
      );
    }

    const refreshedTable = await queryRunner.getTable(this.table);
    const foreignKey = refreshedTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes(this.column),
    );
    if (!foreignKey) {
      await queryRunner.createForeignKey(
        this.table,
        new TableForeignKey({
          columnNames: [this.column],
          referencedTableName: this.referencedTable,
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }
}
