import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
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
import {
  CloseShiftDTO,
  ShiftManagementDTO,
} from './dtos/shift-management.dto';
import { ShiftManagementQueryDTO } from './dtos/shift-management-query.dto';
import { ShiftManagement } from './shift-management.entity';
import { User } from '../user/user.entity';
import type { Request } from 'src/core/utils/request';
import {
  buildSearchQuery,
  setPaginationHeaders,
} from 'src/core/utils/search-query.builder';
import { mapShiftManagementToShiftManagementDtoSelective } from './shift-management.mapper';
import { Between, FindOptionsWhere } from 'typeorm';
import { RequestShiftManagementDTO } from './dtos/request.shit-managment,dto';
import { AuthService } from 'src/app/modules/auth/auth.service';
import { resolveScopedBranchId } from 'src/core/utils/branch-scope';

@Controller('shift-managements')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.MANAGER)
@ApiTags('shift-managements-module')
export class ShiftManagementController {
  logger = new Logger('ShiftManagementController');

  constructor(
    private readonly shiftManagementService: ShiftManagementService,
    private readonly authService: AuthService,
  ) {}

  @Get('/')
  @ApiOperation({
    summary: 'Get the list of shifts paginated',
    description:
      'Admin sees all branches. Manager is scoped to their own branch. Optional from/to filters startShift.',
  })
  @ApiResponse({
    status: 200,
    description: 'List all shifts',
    type: ShiftManagementDTO,
    isArray: true,
  })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAllShifts(
    @Req() req: Request,
    @Query() query: ShiftManagementQueryDTO,
    @AuthUser() user: User,
  ): Promise<Partial<ShiftManagementDTO>[]> {
    const where: FindOptionsWhere<ShiftManagement> = {};
    const scopedBranchId = resolveScopedBranchId(user, query.branchId);

    if (scopedBranchId !== undefined) {
      where.branch = { id: scopedBranchId };
    }
    if (query.cashierId !== undefined) {
      where.cashier = { id: query.cashierId };
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.from && query.to) {
      where.startShift = Between(new Date(query.from), new Date(query.to));
    }

    const findOptions = buildSearchQuery<ShiftManagement>({
      query,
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: ['branch', 'cashier'],
    });

    const [results, count] =
      await this.shiftManagementService.findAndCount(findOptions);

    setPaginationHeaders(req, count, query);
    return mapShiftManagementToShiftManagementDtoSelective(results);
  }

  @Post('open')
  @Roles(UserRole.CASHIER)
  @ApiOperation({
    summary: 'Open a shift for the logged-in cashier',
    description:
      'JWT must be CASHIER. Body is manager username/password. Branch is resolved from the cashier. Resets branch order queue counter.',
  })
  @ApiResponse({ status: 201, type: ShiftManagement })
  async openShift(
    @Body() request: RequestShiftManagementDTO,
    @AuthUser() cashier: User,
  ): Promise<ShiftManagement> {
    const manager = await this.authService.validateCredentials(
      request.username,
      request.password,
    );
    if (!manager) {
      throw new UnauthorizedException('Invalid manager credentials!');
    }

    return this.shiftManagementService.openShift(cashier, manager);
  }

  @Post('end')
  @ApiOperation({
    summary: 'Close the logged-in cashier open shift',
    description: 'JWT must be CASHIER. Body is manager username/password.',
  })
  @ApiResponse({ status: 200, type: ShiftManagement })
  @Roles(UserRole.CASHIER)
  async endShift(
    @AuthUser() cashier: User,
    @Body() request: RequestShiftManagementDTO,
  ): Promise<ShiftManagement> {
    const manager = await this.authService.validateCredentials(
      request.username,
      request.password,
    );
    if (!manager) {
      throw new UnauthorizedException('Invalid manager credentials!');
    }

    return this.shiftManagementService.endShift(cashier, manager);
  }

  @Get('has-open-shift')
  @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: 'Check if a cashier has an open shift' })
  @ApiResponse({ status: 200, type: Boolean })
  async hasOpenShift(@AuthUser() user: User): Promise<boolean> {
    return this.shiftManagementService.hasOpenShift(user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a shift by id' })
  @ApiResponse({ status: 200, type: ShiftManagementDTO })
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: User,
  ): Promise<Partial<ShiftManagementDTO>> {
    const shift = await this.shiftManagementService.findById(id);
    if (!shift) {
      throw new NotFoundException(`Shift with id ${id} not found`);
    }
    if (user.role !== UserRole.ADMIN) {
      const scopedBranchId = resolveScopedBranchId(user);
      if (shift.branch?.id !== scopedBranchId) {
        throw new NotFoundException(`Shift with id ${id} not found`);
      }
    }
    return mapShiftManagementToShiftManagementDtoSelective(shift);
  }

  @Post(':id/close')
  @HttpCode(200)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Force-close an OPEN shift by id',
    description:
      'Admin may close any OPEN shift. Manager may close OPEN shifts at their own branch. JWT only — no extra manager password. Does not change order statuses.',
  })
  @ApiResponse({ status: 200, type: ShiftManagementDTO })
  async closeShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CloseShiftDTO,
    @AuthUser() user: User,
  ): Promise<Partial<ShiftManagementDTO>> {
    const shift = await this.shiftManagementService.closeShiftById(
      id,
      user,
      body?.endMoney,
    );
    return mapShiftManagementToShiftManagementDtoSelective(shift);
  }

  @Post(':id/calculate-orders-totals')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Calculate the end money and order count for a CLOSED shift',
    description:
      'Admin only. Sums PREPARED order totals, sets status CALCULATED, marks those orders SHIFT_CALCULATED. Returns the full shift including totalOrders and actualEndMoney.',
  })
  @ApiResponse({ status: 200, type: ShiftManagementDTO })
  async calculateOrdersTotals(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: User,
  ): Promise<Partial<ShiftManagementDTO>> {
    const shift = await this.shiftManagementService.calculateOrdersTotals(
      id,
      user.username,
    );
    return mapShiftManagementToShiftManagementDtoSelective(shift);
  }
}
