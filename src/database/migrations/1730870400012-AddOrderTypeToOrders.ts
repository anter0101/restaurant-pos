import { OrderType } from 'src/core/enums/order-type';
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderTypeToOrders1730870400012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable && !ordersTable.findColumnByName('order_type')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'order_type',
          type: 'enum',
          enum: [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY],
          isNullable: false,
          default: `'${OrderType.TAKEAWAY}'`,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable?.findColumnByName('order_type')) {
      await queryRunner.dropColumn('orders', 'order_type');
    }
  }
}
