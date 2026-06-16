import { OrderStatus } from 'src/core/enums/order-status';
import { baseColumns } from 'src/core/utils/base.migration';
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateOrdersTable1730870400008 implements MigrationInterface {
  private readonly table = 'orders';

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
            name: 'customer_id',
            type: 'int4',
            isNullable: true,
          },
          {
            name: 'delivery_region_id',
            type: 'int4',
            isNullable: true,
          },
          {
            name: 'shift_management_id',
            type: 'int4',
            isNullable: true,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'delivery_fees',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: '0.00',
          },
          {
            name: 'service_fee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: '0.00',
          },
          {
            name: 'items_subtotal',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              OrderStatus.PENDING,
              OrderStatus.PREPARED,
              OrderStatus.ENDED,
              OrderStatus.CANCELLED,
            ],
            default: `'${OrderStatus.PENDING}'`,
            isNullable: false,
          },
          {
            name: 'order_queue',
            type: 'int4',
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
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      this.table,
      new TableForeignKey({
        columnNames: ['customer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      this.table,
      new TableForeignKey({
        columnNames: ['delivery_region_id'],
        referencedTableName: 'delivery_regions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      this.table,
      new TableForeignKey({
        columnNames: ['shift_management_id'],
        referencedTableName: 'shift_managements',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.table, true, true, true);
  }
}
