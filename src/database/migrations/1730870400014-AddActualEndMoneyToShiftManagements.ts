import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddActualEndMoneyToShiftManagements1730870400014
  implements MigrationInterface
{
  private readonly table = 'shift_managements';
  private readonly column = 'actual_end_money';

  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists`,
      [tableName, columnName],
    );
    return Boolean(exists);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, this.table, this.column)) {
      return;
    }

    await queryRunner.addColumn(
      this.table,
      new TableColumn({
        name: this.column,
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, this.table, this.column))) {
      return;
    }

    await queryRunner.dropColumn(this.table, this.column);
  }
}
