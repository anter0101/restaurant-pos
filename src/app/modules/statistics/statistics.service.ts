import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Order } from '../order/order.entity';
import { ShiftManagement } from '../shift-management/shift-management.entity';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { UserRole } from 'src/core/enums/user-role';
import { roundMoney } from 'src/core/utils/order-totals.util';
import {
  parseDateRange,
} from 'src/core/utils/date-range';
import {
  assertShiftBranchAccess,
  resolveScopedBranchId,
} from 'src/core/utils/branch-scope';
import {
  PrintBranchKpisQueryDTO,
  PrintShiftOrdersQueryDTO,
  PrintSummaryQueryDTO,
  StatisticsDashboardQueryDTO,
} from './dtos/statistics-query.dto';
import {
  PrintEnvelopeDTO,
  PrintOrderRowDTO,
  StatisticsBranchRowDTO,
  StatisticsDashboardDTO,
  StatisticsDailyTrendDTO,
  StatisticsKpisDTO,
  StatisticsStatusBreakdownDTO,
  StatisticsTopItemDTO,
  StatisticsTypeBreakdownDTO,
} from './dtos/statistics-response.dto';

const REVENUE_STATUSES = [OrderStatus.PREPARED, OrderStatus.SHIFT_CALCULATED];

type OrderStatusAgg = {
  status: OrderStatus;
  count: string;
  revenue: string;
  itemsSubtotal: string;
  deliveryFees: string;
  serviceFees: string;
};

type TypeAgg = { orderType: OrderType; count: string; revenue: string };
type TopAgg = {
  menuItemId: string;
  nameAr?: string;
  nameEn?: string;
  quantity: string;
  revenue: string;
};
type DayAgg = { date: string; orderCount: string; revenue: string };
type BranchAgg = {
  branchId: string;
  branchName: string;
  orderCount: string;
  revenue: string;
};
type ShiftAgg = {
  status: ShiftStatus;
  count: string;
  declared: string;
  actual: string;
};

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(ShiftManagement)
    private readonly shiftRepository: Repository<ShiftManagement>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async getDashboard(
    user: User,
    query: StatisticsDashboardQueryDTO,
  ): Promise<StatisticsDashboardDTO> {
    const branchId = resolveScopedBranchId(user, query.branchId);
    const range = parseDateRange(query.from, query.to);
    const topItemsLimit = query.topItemsLimit ?? 10;
    return this.buildDashboard(query.from, query.to, range, branchId, topItemsLimit);
  }

  async printShiftOrders(
    user: User,
    query: PrintShiftOrdersQueryDTO,
  ): Promise<PrintEnvelopeDTO> {
    const shift = await this.shiftRepository.findOne({
      where: { id: query.shiftId },
      relations: ['branch', 'cashier'],
    });
    if (!shift) {
      throw new NotFoundException(`Shift with id ${query.shiftId} not found`);
    }
    assertShiftBranchAccess(user, shift.branch?.id);

    const fromDate = query.from
      ? new Date(query.from)
      : shift.startShift;
    const toDate = query.to
      ? new Date(query.to)
      : (shift.endShift ?? new Date());
    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();

    const orders = await this.orderRepository.find({
      where: {
        shift: { id: shift.id },
        createdAt: Between(fromDate, toDate),
      },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });

    const printOrders: PrintOrderRowDTO[] = orders.map((order) => ({
      id: order.id,
      orderQueue: order.orderQueue,
      orderType: order.orderType,
      status: order.status,
      createdAt: order.createdAt,
      itemsSubtotal: order.itemsSubtotal,
      deliveryFees: order.deliveryFees,
      serviceFee: order.serviceFee,
      totalAmount: order.totalAmount,
      items: (order.items ?? []).map((item) => ({
        nameAr: item.menuItemNameAr,
        nameEn: item.menuItemNameEn,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: roundMoney(item.unitPrice * item.quantity),
      })),
    }));

    const revenueOrders = orders.filter((order) =>
      REVENUE_STATUSES.includes(order.status),
    );
    const revenue = roundMoney(
      revenueOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    );

    return {
      kind: 'SHIFT_ORDERS',
      printedAt: new Date().toISOString(),
      from: fromIso,
      to: toIso,
      branch: shift.branch
        ? {
            id: shift.branch.id,
            name: shift.branch.name,
            address: shift.branch.address,
            phone: shift.branch.phone,
          }
        : null,
      header: {
        shiftId: shift.id,
        status: shift.status,
        cashierName: shift.cashier?.name,
        startShift: shift.startShift,
        endShift: shift.endShift,
        endMoney: shift.endMoney,
        actualEndMoney: shift.actualEndMoney,
        totalOrders: shift.totalOrders,
      },
      sections: { orders: printOrders },
      footer: { revenue, orderCount: revenueOrders.length },
    };
  }

  async printBranchKpis(
    user: User,
    query: PrintBranchKpisQueryDTO,
  ): Promise<PrintEnvelopeDTO> {
    if (user.role !== UserRole.MANAGER && query.branchId == null) {
      throw new BadRequestException('branchId is required');
    }
    const dashboard = await this.getDashboard(user, {
      from: query.from,
      to: query.to,
      branchId: query.branchId,
      topItemsLimit: query.topItemsLimit,
    });
    if (dashboard.scope.branchId == null) {
      throw new BadRequestException('branchId is required');
    }

    const range = parseDateRange(query.from, query.to);
    const shifts = await this.listShiftsInRange(range, dashboard.scope.branchId);

    return {
      kind: 'BRANCH_KPIS',
      printedAt: new Date().toISOString(),
      from: query.from,
      to: query.to,
      branch: await this.loadPrintBranch(dashboard.scope.branchId),
      kpis: dashboard.kpis,
      sections: {
        byOrderType: dashboard.byOrderType,
        byStatus: dashboard.byStatus,
        topItems: dashboard.topItems,
        dailyTrend: dashboard.dailyTrend,
        shifts,
      },
      footer: {
        revenue: dashboard.kpis.revenue,
        orderCount: dashboard.kpis.orderCount,
      },
    };
  }

  async printSummary(
    user: User,
    query: PrintSummaryQueryDTO,
  ): Promise<PrintEnvelopeDTO> {
    const dashboard = await this.getDashboard(user, query);
    const branch =
      dashboard.scope.branchId != null
        ? await this.loadPrintBranch(dashboard.scope.branchId)
        : null;

    return {
      kind: 'SUMMARY',
      printedAt: new Date().toISOString(),
      from: query.from,
      to: query.to,
      branch,
      kpis: dashboard.kpis,
      sections: {
        branches: dashboard.branches,
        totals: dashboard.kpis,
        topItems: dashboard.topItems,
      },
      footer: {
        revenue: dashboard.kpis.revenue,
        orderCount: dashboard.kpis.orderCount,
      },
    };
  }

  private async buildDashboard(
    fromIso: string,
    toIso: string,
    range: { from: Date; to: Date },
    branchId: number | undefined,
    topItemsLimit: number,
  ): Promise<StatisticsDashboardDTO> {
    const [
      byStatus,
      money,
      byOrderType,
      topItems,
      dailyTrend,
      branches,
      shiftKpis,
      scope,
    ] = await Promise.all([
      this.aggregateByStatus(range, branchId),
      this.moneyTotals(range, branchId),
      this.aggregateByOrderType(range, branchId),
      this.aggregateTopItems(range, branchId, topItemsLimit),
      this.aggregateDailyTrend(range, branchId),
      this.aggregateBranches(range, branchId),
      this.aggregateShiftKpis(range, branchId),
      this.resolveScope(branchId),
    ]);

    const kpis = this.kpisFromStatusRows(byStatus, money, shiftKpis);

    return {
      from: fromIso,
      to: toIso,
      scope,
      kpis,
      byOrderType,
      byStatus,
      topItems,
      dailyTrend,
      branches,
    };
  }

  private kpisFromStatusRows(
    byStatus: StatisticsStatusBreakdownDTO[],
    money: {
      itemsSubtotal: number;
      deliveryFees: number;
      serviceFees: number;
    },
    shiftKpis: {
      openShifts: number;
      closedShifts: number;
      calculatedShifts: number;
      shiftDeclaredEndMoney: number;
      shiftActualEndMoney: number;
    },
  ): StatisticsKpisDTO {
    const pendingCount =
      byStatus.find((row) => row.status === OrderStatus.PENDING)?.count ?? 0;
    const returnedCount =
      byStatus.find((row) => row.status === OrderStatus.RETURNED)?.count ?? 0;
    const revenueRows = byStatus.filter((row) =>
      REVENUE_STATUSES.includes(row.status),
    );
    const orderCount = revenueRows.reduce((sum, row) => sum + row.count, 0);
    const revenue = roundMoney(
      revenueRows.reduce((sum, row) => sum + row.revenue, 0),
    );

    return {
      orderCount,
      revenue,
      itemsSubtotal: money.itemsSubtotal,
      deliveryFees: money.deliveryFees,
      serviceFees: money.serviceFees,
      averageOrderValue: orderCount === 0 ? 0 : roundMoney(revenue / orderCount),
      pendingCount,
      returnedCount,
      ...shiftKpis,
    };
  }

  private applyOrderRange(
    qb: ReturnType<Repository<Order>['createQueryBuilder']>,
    range: { from: Date; to: Date },
    branchId?: number,
  ) {
    qb.andWhere('order.createdAt >= :from', { from: range.from }).andWhere(
      'order.createdAt <= :to',
      { to: range.to },
    );
    if (branchId !== undefined) {
      qb.andWhere('order.branch.id = :branchId', { branchId });
    }
    return qb;
  }

  private async aggregateByStatus(
    range: { from: Date; to: Date },
    branchId?: number,
  ): Promise<StatisticsStatusBreakdownDTO[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .addSelect('COALESCE(SUM(order.itemsSubtotal), 0)', 'itemsSubtotal')
      .addSelect('COALESCE(SUM(order.deliveryFees), 0)', 'deliveryFees')
      .addSelect('COALESCE(SUM(order.serviceFee), 0)', 'serviceFees')
      .groupBy('order.status');
    this.applyOrderRange(qb, range, branchId);
    const rows = await qb.getRawMany<OrderStatusAgg>();
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
      revenue: roundMoney(Number(row.revenue)),
    }));
  }

  private async moneyTotals(
    range: { from: Date; to: Date },
    branchId?: number,
  ): Promise<{ itemsSubtotal: number; deliveryFees: number; serviceFees: number }> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.itemsSubtotal), 0)', 'itemsSubtotal')
      .addSelect('COALESCE(SUM(order.deliveryFees), 0)', 'deliveryFees')
      .addSelect('COALESCE(SUM(order.serviceFee), 0)', 'serviceFees')
      .where('order.status IN (:...statuses)', { statuses: REVENUE_STATUSES });
    this.applyOrderRange(qb, range, branchId);
    const row = await qb.getRawOne<{
      itemsSubtotal: string;
      deliveryFees: string;
      serviceFees: string;
    }>();
    return {
      itemsSubtotal: roundMoney(Number(row?.itemsSubtotal ?? 0)),
      deliveryFees: roundMoney(Number(row?.deliveryFees ?? 0)),
      serviceFees: roundMoney(Number(row?.serviceFees ?? 0)),
    };
  }

  private async aggregateByOrderType(
    range: { from: Date; to: Date },
    branchId?: number,
  ): Promise<StatisticsTypeBreakdownDTO[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select('order.orderType', 'orderType')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .where('order.status IN (:...statuses)', { statuses: REVENUE_STATUSES })
      .groupBy('order.orderType');
    this.applyOrderRange(qb, range, branchId);
    const rows = await qb.getRawMany<TypeAgg>();
    return rows.map((row) => ({
      orderType: row.orderType,
      count: Number(row.count),
      revenue: roundMoney(Number(row.revenue)),
    }));
  }

  private async aggregateTopItems(
    range: { from: Date; to: Date },
    branchId: number | undefined,
    limit: number,
  ): Promise<StatisticsTopItemDTO[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .innerJoin('item.menuItem', 'menuItem')
      .select('menuItem.id', 'menuItemId')
      .addSelect('MAX(item.menuItemNameAr)', 'nameAr')
      .addSelect('MAX(item.menuItemNameEn)', 'nameEn')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('COALESCE(SUM(item.quantity * item.unitPrice), 0)', 'revenue')
      .where('order.status IN (:...statuses)', { statuses: REVENUE_STATUSES })
      .groupBy('menuItem.id')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(limit);
    this.applyOrderRange(qb, range, branchId);
    const rows = await qb.getRawMany<TopAgg>();
    return rows.map((row) => ({
      menuItemId: Number(row.menuItemId),
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      quantity: Number(row.quantity),
      revenue: roundMoney(Number(row.revenue)),
    }));
  }

  private async aggregateDailyTrend(
    range: { from: Date; to: Date },
    branchId?: number,
  ): Promise<StatisticsDailyTrendDTO[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select(
        `to_char(date_trunc('day', order.createdAt), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .where('order.status IN (:...statuses)', { statuses: REVENUE_STATUSES })
      .groupBy(`date_trunc('day', order.createdAt)`)
      .orderBy(`date_trunc('day', order.createdAt)`, 'ASC');
    this.applyOrderRange(qb, range, branchId);
    const rows = await qb.getRawMany<DayAgg>();
    return rows.map((row) => ({
      date: row.date,
      orderCount: Number(row.orderCount),
      revenue: roundMoney(Number(row.revenue)),
    }));
  }

  private async aggregateBranches(
    range: { from: Date; to: Date },
    branchId?: number,
  ): Promise<StatisticsBranchRowDTO[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.branch', 'branch')
      .select('branch.id', 'branchId')
      .addSelect('branch.name', 'branchName')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .where('order.status IN (:...statuses)', { statuses: REVENUE_STATUSES })
      .groupBy('branch.id')
      .addGroupBy('branch.name')
      .orderBy('COALESCE(SUM(order.totalAmount), 0)', 'DESC');
    this.applyOrderRange(qb, range, branchId);
    const rows = await qb.getRawMany<BranchAgg>();
    return rows.map((row) => {
      const orderCount = Number(row.orderCount);
      const revenue = roundMoney(Number(row.revenue));
      return {
        branchId: Number(row.branchId),
        branchName: row.branchName,
        orderCount,
        revenue,
        averageOrderValue:
          orderCount === 0 ? 0 : roundMoney(revenue / orderCount),
      };
    });
  }

  private async aggregateShiftKpis(
    range: { from: Date; to: Date },
    branchId?: number,
  ) {
    const qb = this.shiftRepository
      .createQueryBuilder('shift')
      .select('shift.status', 'status')
      .addSelect('COUNT(shift.id)', 'count')
      .addSelect('COALESCE(SUM(shift.endMoney), 0)', 'declared')
      .addSelect('COALESCE(SUM(shift.actualEndMoney), 0)', 'actual')
      .where('shift.startShift >= :from', { from: range.from })
      .andWhere('shift.startShift <= :to', { to: range.to })
      .groupBy('shift.status');
    if (branchId !== undefined) {
      qb.andWhere('shift.branch.id = :branchId', { branchId });
    }
    const rows = await qb.getRawMany<ShiftAgg>();
    const pick = (status: ShiftStatus) =>
      rows.find((row) => row.status === status);

    return {
      openShifts: Number(pick(ShiftStatus.OPEN)?.count ?? 0),
      closedShifts: Number(pick(ShiftStatus.CLOSED)?.count ?? 0),
      calculatedShifts: Number(pick(ShiftStatus.CALCULATED)?.count ?? 0),
      shiftDeclaredEndMoney: roundMoney(
        rows.reduce((sum, row) => sum + Number(row.declared), 0),
      ),
      shiftActualEndMoney: roundMoney(
        rows.reduce((sum, row) => sum + Number(row.actual), 0),
      ),
    };
  }

  private async listShiftsInRange(
    range: { from: Date; to: Date },
    branchId: number,
  ) {
    const shifts = await this.shiftRepository.find({
      where: {
        branch: { id: branchId },
        startShift: Between(range.from, range.to),
      },
      relations: ['cashier'],
      order: { startShift: 'ASC' },
    });
    return shifts.map((shift) => ({
      id: shift.id,
      cashierName: shift.cashier?.name,
      status: shift.status,
      startShift: shift.startShift,
      endShift: shift.endShift,
      actualEndMoney: shift.actualEndMoney,
    }));
  }

  private async resolveScope(branchId?: number) {
    if (branchId == null) {
      return { branchId: null, branchName: null };
    }
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    return {
      branchId,
      branchName: branch?.name ?? null,
    };
  }

  private async loadPrintBranch(branchId: number) {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    if (!branch) {
      return null;
    }
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    };
  }
}
