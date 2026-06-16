import { ShiftStatus } from 'src/core/enums/shift-status';
import { baseColumns } from 'src/core/utils/base.migration';
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateShiftManagementsTable1730870400007
  implements MigrationInterface
{
  private readonly table = 'shift_managements';

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
            name: 'cashier_id',
            type: 'int4',
            isNullable: false,
          },
          {
            name: 'start_shift',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'end_shift',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'end_money',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [ShiftStatus.OPEN, ShiftStatus.CLOSED],
            default: `'${ShiftStatus.OPEN}'`,
            isNullable: false,
          },
          {
            name: 'total_orders',
            type: 'int4',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
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

    await queryRunner.createForeignKey(
      this.table,
      new TableForeignKey({
        columnNames: ['cashier_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.table, true, true, true);
  }
}
