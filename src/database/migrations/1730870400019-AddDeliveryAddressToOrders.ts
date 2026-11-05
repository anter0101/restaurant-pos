import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeliveryAddressToOrders1730870400019
  implements MigrationInterface
{
  private readonly table = 'orders';
  private readonly column = 'delivery_address';

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
        type: 'varchar',
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
