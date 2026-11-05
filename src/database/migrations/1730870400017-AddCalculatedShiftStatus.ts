import { ShiftStatus } from 'src/core/enums/shift-status';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalculatedShiftStatus1730870400017
  implements MigrationInterface
{
  private readonly enumTypeName = 'shift_managements_status_enum';
  private readonly newValue = ShiftStatus.CALCULATED;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = $1 AND e.enumlabel = $2
      ) AS exists`,
      [this.enumTypeName, this.newValue],
    );

    if (!exists) {
      await queryRunner.query(
        `ALTER TYPE "${this.enumTypeName}" ADD VALUE '${this.newValue}'`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing individual enum values safely.
  }
}
