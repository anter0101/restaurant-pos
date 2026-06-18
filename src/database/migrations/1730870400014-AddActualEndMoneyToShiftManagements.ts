import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddActualEndMoneyToShiftManagements1730870400014
  implements MigrationInterface
{
  private readonly table = 'shift_managements';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      this.table,
      new TableColumn({
        name: 'actual_end_money',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(this.table, 'actual_end_money');
  }
}
