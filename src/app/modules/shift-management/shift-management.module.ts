import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftManagement } from './shift-management.entity';
import { ShiftManagementService } from './shift-management.service';
import { ShiftManagementController } from './shift-management.controller';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShiftManagement, Branch, User]),
  ],
  controllers: [ShiftManagementController],
  providers: [ShiftManagementService],
  exports: [ShiftManagementService],
})
export class ShiftManagementModule {}
