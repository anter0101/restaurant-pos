import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSecondaryAndThirdAddressToCustomers1730870400020
  implements MigrationInterface
{
  private readonly table = 'customers';

  private async columnExists(
    queryRunner: QueryRunner,
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
      [this.table, columnName],
    );
    return Boolean(exists);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'secondary_address'))) {
      await queryRunner.addColumn(
        this.table,
        new TableColumn({
          name: 'secondary_address',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    if (!(await this.columnExists(queryRunner, 'third_address'))) {
      await queryRunner.addColumn(
        this.table,
        new TableColumn({
          name: 'third_address',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'third_address')) {
      await queryRunner.dropColumn(this.table, 'third_address');
    }
    if (await this.columnExists(queryRunner, 'secondary_address')) {
      await queryRunner.dropColumn(this.table, 'secondary_address');
    }
  }
}
