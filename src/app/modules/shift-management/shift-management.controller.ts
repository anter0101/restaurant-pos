import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, AuthUser } from 'src/core/security';
import { UserRole } from 'src/core/enums/user-role';
import { ShiftManagementService } from './shift-management.service';
import { EndShiftDTO, OpenShiftDTO } from './dtos/shift-management.dto';
import { ShiftManagement } from './shift-management.entity';
import { User } from '../user/user.entity';

@Controller('shift-managements')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.MANAGER)
@ApiTags('shift-managements-module')
export class ShiftManagementController {
  logger = new Logger('ShiftManagementController');

  constructor(private readonly shiftManagementService: ShiftManagementService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open a shift and reset branch order queue counter' })
  @ApiResponse({ status: 201, type: ShiftManagement })
  async openShift(
    @Body() dto: OpenShiftDTO,
    @AuthUser() user: User,
  ): Promise<ShiftManagement> {
    return this.shiftManagementService.openShift(dto, user?.username);
  }

  @Put(':id/end')
  @ApiOperation({
    summary: 'Close a shift, end prepared orders, reset queue counter',
  })
  @ApiResponse({ status: 200, type: ShiftManagement })
  async endShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EndShiftDTO,
    @AuthUser() user: User,
  ): Promise<ShiftManagement> {
    return this.shiftManagementService.endShift(id, dto, user?.username);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by id' })
  @ApiResponse({ status: 200, type: ShiftManagement })
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ShiftManagement> {
    const shift = await this.shiftManagementService.findById(id);
    if (!shift) {
      throw new NotFoundException(`Shift with id ${id} not found`);
    }
    return shift;
  }
}
