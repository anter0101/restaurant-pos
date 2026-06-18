import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsSteppedKitchenToBranches1730870400015
  implements MigrationInterface
{
  private readonly table = 'branches';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      this.table,
      new TableColumn({
        name: 'is_stepped_kitchen',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(this.table, 'is_stepped_kitchen');
  }
}
