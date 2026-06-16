import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderQueueCounter1730870400011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const branchesTable = await queryRunner.getTable('branches');
    if (branchesTable && !branchesTable.findColumnByName('next_order_queue')) {
      await queryRunner.addColumn(
        'branches',
        new TableColumn({
          name: 'next_order_queue',
          type: 'int4',
          isNullable: false,
          default: 0,
        }),
      );
    }

    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable && !ordersTable.findColumnByName('order_queue')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'order_queue',
          type: 'int4',
          isNullable: false,
          default: 0,
        }),
      );
    }

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE branches
          ADD CONSTRAINT "CHK_branches_next_order_queue_range"
          CHECK (next_order_queue >= 0 AND next_order_queue <= 100);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE orders
          ADD CONSTRAINT "CHK_orders_order_queue_range"
          CHECK (order_queue >= 0 AND order_queue <= 100);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE orders DROP CONSTRAINT IF EXISTS "CHK_orders_order_queue_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE branches DROP CONSTRAINT IF EXISTS "CHK_branches_next_order_queue_range"`,
    );

    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable?.findColumnByName('order_queue')) {
      await queryRunner.dropColumn('orders', 'order_queue');
    }

    const branchesTable = await queryRunner.getTable('branches');
    if (branchesTable?.findColumnByName('next_order_queue')) {
      await queryRunner.dropColumn('branches', 'next_order_queue');
    }
  }
}
