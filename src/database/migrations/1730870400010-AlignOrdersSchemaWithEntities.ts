import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlignOrdersSchemaWithEntities1730870400010
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable?.findColumnByName('fees')) {
      await queryRunner.dropColumn('orders', 'fees');
    }
    if (ordersTable?.findColumnByName('delivery_region_name')) {
      await queryRunner.dropColumn('orders', 'delivery_region_name');
    }
    if (ordersTable?.findColumnByName('service_percentage_snapshot')) {
      await queryRunner.dropColumn('orders', 'service_percentage_snapshot');
    }

    const orderItemsTable = await queryRunner.getTable('order_items');
    if (orderItemsTable?.findColumnByName('subtotal')) {
      await queryRunner.dropColumn('order_items', 'subtotal');
    }
    if (orderItemsTable?.findColumnByName('notes')) {
      await queryRunner.dropColumn('order_items', 'notes');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable && !ordersTable.findColumnByName('fees')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'fees',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: false,
          default: '0.00',
        }),
      );
    }
    if (ordersTable && !ordersTable.findColumnByName('delivery_region_name')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'delivery_region_name',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
    if (
      ordersTable &&
      !ordersTable.findColumnByName('service_percentage_snapshot')
    ) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'service_percentage_snapshot',
          type: 'decimal',
          precision: 5,
          scale: 4,
          isNullable: false,
          default: '0.0000',
        }),
      );
    }

    const orderItemsTable = await queryRunner.getTable('order_items');
    if (orderItemsTable && !orderItemsTable.findColumnByName('subtotal')) {
      await queryRunner.addColumn(
        'order_items',
        new TableColumn({
          name: 'subtotal',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: false,
          default: '0.00',
        }),
      );
    }
    if (orderItemsTable && !orderItemsTable.findColumnByName('notes')) {
      await queryRunner.addColumn(
        'order_items',
        new TableColumn({
          name: 'notes',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }
}
