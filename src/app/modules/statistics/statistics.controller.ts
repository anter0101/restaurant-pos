import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, AuthUser, Roles, RolesGuard } from 'src/core/security';
import { UserRole } from 'src/core/enums/user-role';
import { User } from '../user/user.entity';
import { StatisticsService } from './statistics.service';
import {
  PrintBranchKpisQueryDTO,
  PrintShiftOrdersQueryDTO,
  PrintSummaryQueryDTO,
  StatisticsDashboardQueryDTO,
} from './dtos/statistics-query.dto';
import {
  PrintEnvelopeDTO,
  StatisticsDashboardDTO,
} from './dtos/statistics-response.dto';

@Controller('statistics')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@ApiTags('statistics-module')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Branch / company KPI dashboard',
    description:
      'Revenue counts PREPARED + SHIFT_CALCULATED orders in the createdAt window. Shift KPIs use startShift in the same from/to. Manager is locked to their branch. from/to required, max 366 days.',
  })
  @ApiResponse({ status: 200, type: StatisticsDashboardDTO })
  async dashboard(
    @Query() query: StatisticsDashboardQueryDTO,
    @AuthUser() user: User,
  ): Promise<StatisticsDashboardDTO> {
    return this.statisticsService.getDashboard(user, query);
  }

  @Get('print/shift-orders')
  @ApiOperation({
    summary: 'Print payload for all orders on a shift',
    description:
      'JSON for the POS printer/UI. Lists every order on the shift (including PENDING/RETURNED). Footer revenue uses PREPARED + SHIFT_CALCULATED only.',
  })
  @ApiResponse({ status: 200, type: PrintEnvelopeDTO })
  async printShiftOrders(
    @Query() query: PrintShiftOrdersQueryDTO,
    @AuthUser() user: User,
  ): Promise<PrintEnvelopeDTO> {
    return this.statisticsService.printShiftOrders(user, query);
  }

  @Get('print/branch-kpis')
  @ApiOperation({
    summary: 'Print payload for one branch KPIs',
    description: 'Admin must pass branchId. Manager uses their assigned branch.',
  })
  @ApiResponse({ status: 200, type: PrintEnvelopeDTO })
  async printBranchKpis(
    @Query() query: PrintBranchKpisQueryDTO,
    @AuthUser() user: User,
  ): Promise<PrintEnvelopeDTO> {
    return this.statisticsService.printBranchKpis(user, query);
  }

  @Get('print/summary')
  @ApiOperation({
    summary: 'Print payload for company or branch summary',
    description:
      'Admin without branchId gets all branches. Manager is scoped to their branch.',
  })
  @ApiResponse({ status: 200, type: PrintEnvelopeDTO })
  async printSummary(
    @Query() query: PrintSummaryQueryDTO,
    @AuthUser() user: User,
  ): Promise<PrintEnvelopeDTO> {
    return this.statisticsService.printSummary(user, query);
  }
}
