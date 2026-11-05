import { OrderStatus } from 'src/core/enums/order-status';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignOrderStatusEnum1730870400016 implements MigrationInterface {
  private readonly enumTypeName = 'orders_status_enum';
  private readonly tempEnumTypeName = 'orders_status_enum_new';
  private readonly ordersTable = 'orders';
  private readonly statusColumn = 'status';

  private readonly targetValues = [
    OrderStatus.PENDING,
    OrderStatus.PREPARED,
    OrderStatus.SHIFT_CALCULATED,
    OrderStatus.RETURNED,
  ] as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { enumlabel: string }[] = await queryRunner.query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = $1
       ORDER BY e.enumsortorder`,
      [this.enumTypeName],
    );
    const currentLabels = rows.map((row) => row.enumlabel);

    const alreadyAligned =
      currentLabels.length === this.targetValues.length &&
      this.targetValues.every((value) => currentLabels.includes(value));

    if (alreadyAligned) {
      return;
    }

    const enumList = this.targetValues.map((value) => `'${value}'`).join(', ');

    await queryRunner.query(
      `CREATE TYPE "${this.tempEnumTypeName}" AS ENUM (${enumList})`,
    );

    await queryRunner.query(
      `ALTER TABLE "${this.ordersTable}" ALTER COLUMN "${this.statusColumn}" DROP DEFAULT`,
    );

    await queryRunner.query(`
      ALTER TABLE "${this.ordersTable}"
      ALTER COLUMN "${this.statusColumn}" TYPE "${this.tempEnumTypeName}"
      USING (
        CASE "${this.statusColumn}"::text
          WHEN '${OrderStatus.PENDING}' THEN '${OrderStatus.PENDING}'
          WHEN '${OrderStatus.PREPARED}' THEN '${OrderStatus.PREPARED}'
          WHEN '${OrderStatus.SHIFT_CALCULATED}' THEN '${OrderStatus.SHIFT_CALCULATED}'
          WHEN '${OrderStatus.RETURNED}' THEN '${OrderStatus.RETURNED}'
          WHEN 'ENDED' THEN '${OrderStatus.SHIFT_CALCULATED}'
          WHEN 'SHIFT_CLOSED' THEN '${OrderStatus.SHIFT_CALCULATED}'
          WHEN 'CANCELLED' THEN '${OrderStatus.RETURNED}'
          ELSE '${OrderStatus.PENDING}'
        END::"${this.tempEnumTypeName}"
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "${this.ordersTable}" ALTER COLUMN "${this.statusColumn}" SET DEFAULT '${OrderStatus.PENDING}'`,
    );

    await queryRunner.query(`DROP TYPE "${this.enumTypeName}"`);
    await queryRunner.query(
      `ALTER TYPE "${this.tempEnumTypeName}" RENAME TO "${this.enumTypeName}"`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing individual enum values safely.
  }
}
