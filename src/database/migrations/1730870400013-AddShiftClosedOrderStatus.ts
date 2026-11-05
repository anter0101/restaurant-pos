import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShiftClosedOrderStatus1730870400013
  implements MigrationInterface
{
  private readonly enumTypeName = 'orders_status_enum';
  /** Legacy value; superseded by SHIFT_CALCULATED in migration 1730870400016. */
  private readonly legacyValue = 'SHIFT_CLOSED';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = $1 AND e.enumlabel = $2
      ) AS exists`,
      [this.enumTypeName, this.legacyValue],
    );

    if (!exists) {
      await queryRunner.query(
        `ALTER TYPE "${this.enumTypeName}" ADD VALUE '${this.legacyValue}'`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing individual enum values safely.
  }
}
