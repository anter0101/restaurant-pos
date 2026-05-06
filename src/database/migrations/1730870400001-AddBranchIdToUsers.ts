import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddBranchIdToUsers1730870400001 implements MigrationInterface {
  private readonly usersTable = 'users';
  private readonly branchesTable = 'branches';
  private readonly columnName = 'branch_id';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      this.usersTable,
      new TableColumn({
        name: this.columnName,
        type: 'int4',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      this.usersTable,
      new TableForeignKey({
        columnNames: [this.columnName],
        referencedTableName: this.branchesTable,
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(this.usersTable);
    const fk = table?.foreignKeys.find((f) =>
      f.columnNames.includes(this.columnName),
    );
    if (fk) {
      await queryRunner.dropForeignKey(this.usersTable, fk);
    }
    await queryRunner.dropColumn(this.usersTable, this.columnName);
  }
}
