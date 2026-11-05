import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatisticsIndexes1730870400022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_created_at" ON "orders" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_branch_created_at" ON "orders" ("branch_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_shift_created_at" ON "orders" ("shift_management_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shift_managements_start_shift" ON "shift_managements" ("start_shift")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shift_managements_branch_start" ON "shift_managements" ("branch_id", "start_shift")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_shift_managements_branch_start"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_shift_managements_start_shift"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_order_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_shift_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_branch_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_created_at"`);
  }
}
