import { baseColumns } from 'src/core/utils/base.migration';
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateDeliveryRegionsTable1730870400006
  implements MigrationInterface
{
  private readonly table = 'delivery_regions';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [idColumn, ...otherBaseColumns] = baseColumns;

    await queryRunner.createTable(
      new Table({
        name: this.table,
        columns: [
          idColumn,
          {
            name: 'branch_id',
            type: 'int4',
            isNullable: false,
          },
          {
            name: 'region_name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'delivery_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
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
        columnNames: ['branch_id'],
        referencedTableName: 'branches',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      this.table,
      new TableUnique({
        name: 'UQ_delivery_regions_branch_region_name',
        columnNames: ['branch_id', 'region_name'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.table, true, true, true);
  }
}
