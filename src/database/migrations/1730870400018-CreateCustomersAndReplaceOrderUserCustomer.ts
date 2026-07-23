import { CustomerType } from 'src/core/enums/customer-type';
import { baseColumns } from 'src/core/utils/base.migration';
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateCustomersAndReplaceOrderUserCustomer1730870400018
  implements MigrationInterface
{
  private readonly customersTable = 'customers';
  private readonly ordersTable = 'orders';
  private readonly deliveryRegionsTable = 'delivery_regions';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [idColumn, ...otherBaseColumns] = baseColumns;

    await queryRunner.createTable(
      new Table({
        name: this.customersTable,
        columns: [
          idColumn,
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'alternative_phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'customer_type',
            type: 'enum',
            enum: [CustomerType.NORMAL, CustomerType.SPECIAL],
            default: `'${CustomerType.NORMAL}'`,
            isNullable: false,
          },
          {
            name: 'default_delivery_region_id',
            type: 'int4',
            isNullable: true,
          },
          ...otherBaseColumns,
        ],
      }),
      false,
    );

    await queryRunner.createForeignKey(
      this.customersTable,
      new TableForeignKey({
        columnNames: ['default_delivery_region_id'],
        referencedTableName: this.deliveryRegionsTable,
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    const ordersTable = await queryRunner.getTable(this.ordersTable);
    const customerFk = ordersTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('customer_id'),
    );
    if (customerFk) {
      await queryRunner.dropForeignKey(this.ordersTable, customerFk);
    }

    await queryRunner.dropColumn(this.ordersTable, 'customer_id');

    await queryRunner.addColumn(
      this.ordersTable,
      new TableColumn({
        name: 'customer_id',
        type: 'int4',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      this.ordersTable,
      new TableForeignKey({
        columnNames: ['customer_id'],
        referencedTableName: this.customersTable,
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    const deliveryRegionsTable = await queryRunner.getTable(
      this.deliveryRegionsTable,
    );
    const branchRegionUnique = deliveryRegionsTable?.uniques.find(
      (u) => u.name === 'UQ_delivery_regions_branch_region_name',
    );
    if (branchRegionUnique) {
      await queryRunner.dropUniqueConstraint(
        this.deliveryRegionsTable,
        branchRegionUnique,
      );
    }

    const branchFk = deliveryRegionsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('branch_id'),
    );
    if (branchFk) {
      await queryRunner.dropForeignKey(this.deliveryRegionsTable, branchFk);
    }

    await queryRunner.changeColumn(
      this.deliveryRegionsTable,
      'branch_id',
      new TableColumn({
        name: 'branch_id',
        type: 'int4',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      this.deliveryRegionsTable,
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedTableName: 'branches',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_delivery_regions_region_name_global" ON "${this.deliveryRegionsTable}" ("region_name") WHERE "branch_id" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_delivery_regions_branch_region_name" ON "${this.deliveryRegionsTable}" ("branch_id", "region_name") WHERE "branch_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_delivery_regions_branch_region_name"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_delivery_regions_region_name_global"`,
    );

    const deliveryRegionsTable = await queryRunner.getTable(
      this.deliveryRegionsTable,
    );
    const branchFk = deliveryRegionsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('branch_id'),
    );
    if (branchFk) {
      await queryRunner.dropForeignKey(this.deliveryRegionsTable, branchFk);
    }

    await queryRunner.changeColumn(
      this.deliveryRegionsTable,
      'branch_id',
      new TableColumn({
        name: 'branch_id',
        type: 'int4',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      this.deliveryRegionsTable,
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedTableName: 'branches',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      this.deliveryRegionsTable,
      new TableUnique({
        name: 'UQ_delivery_regions_branch_region_name',
        columnNames: ['branch_id', 'region_name'],
      }),
    );

    const ordersTable = await queryRunner.getTable(this.ordersTable);
    const customerEntityFk = ordersTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('customer_id'),
    );
    if (customerEntityFk) {
      await queryRunner.dropForeignKey(this.ordersTable, customerEntityFk);
    }

    await queryRunner.dropColumn(this.ordersTable, 'customer_id');

    await queryRunner.addColumn(
      this.ordersTable,
      new TableColumn({
        name: 'customer_id',
        type: 'int4',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      this.ordersTable,
      new TableForeignKey({
        columnNames: ['customer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.dropTable(this.customersTable, true, true, true);
  }
}
