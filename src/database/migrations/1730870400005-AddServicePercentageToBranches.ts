import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddServicePercentageToBranches1730870400005
  implements MigrationInterface
{
  private readonly table = 'branches';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      this.table,
      new TableColumn({
        name: 'service_percentage',
        type: 'decimal',
        precision: 5,
        scale: 4,
        isNullable: false,
        default: '0.0000',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(this.table, 'service_percentage');
  }
}
