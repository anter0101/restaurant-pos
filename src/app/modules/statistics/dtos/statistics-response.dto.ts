import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { ShiftStatus } from 'src/core/enums/shift-status';

export class StatisticsScopeDTO {
  @ApiProperty({ required: false, nullable: true })
  branchId?: number | null;

  @ApiProperty({ required: false, nullable: true })
  branchName?: string | null;
}

export class StatisticsKpisDTO {
  @ApiProperty()
  orderCount: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  itemsSubtotal: number;

  @ApiProperty()
  deliveryFees: number;

  @ApiProperty()
  serviceFees: number;

  @ApiProperty()
  averageOrderValue: number;

  @ApiProperty()
  pendingCount: number;

  @ApiProperty()
  returnedCount: number;

  @ApiProperty()
  openShifts: number;

  @ApiProperty()
  closedShifts: number;

  @ApiProperty()
  calculatedShifts: number;

  @ApiProperty()
  shiftDeclaredEndMoney: number;

  @ApiProperty()
  shiftActualEndMoney: number;
}

export class StatisticsTypeBreakdownDTO {
  @ApiProperty({ enum: OrderType })
  orderType: OrderType;

  @ApiProperty()
  count: number;

  @ApiProperty()
  revenue: number;
}

export class StatisticsStatusBreakdownDTO {
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  count: number;

  @ApiProperty()
  revenue: number;
}

export class StatisticsTopItemDTO {
  @ApiProperty()
  menuItemId: number;

  @ApiProperty({ required: false })
  nameAr?: string;

  @ApiProperty({ required: false })
  nameEn?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  revenue: number;
}

export class StatisticsDailyTrendDTO {
  @ApiProperty({ example: '2026-10-01' })
  date: string;

  @ApiProperty()
  orderCount: number;

  @ApiProperty()
  revenue: number;
}

export class StatisticsBranchRowDTO {
  @ApiProperty()
  branchId: number;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  orderCount: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  averageOrderValue: number;
}

export class StatisticsDashboardDTO {
  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty({ type: StatisticsScopeDTO })
  scope: StatisticsScopeDTO;

  @ApiProperty({ type: StatisticsKpisDTO })
  kpis: StatisticsKpisDTO;

  @ApiProperty({ type: [StatisticsTypeBreakdownDTO] })
  byOrderType: StatisticsTypeBreakdownDTO[];

  @ApiProperty({ type: [StatisticsStatusBreakdownDTO] })
  byStatus: StatisticsStatusBreakdownDTO[];

  @ApiProperty({ type: [StatisticsTopItemDTO] })
  topItems: StatisticsTopItemDTO[];

  @ApiProperty({ type: [StatisticsDailyTrendDTO] })
  dailyTrend: StatisticsDailyTrendDTO[];

  @ApiProperty({ type: [StatisticsBranchRowDTO] })
  branches: StatisticsBranchRowDTO[];
}

export class PrintOrderItemDTO {
  @ApiProperty()
  nameAr?: string;

  @ApiProperty()
  nameEn?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  lineTotal: number;
}

export class PrintOrderRowDTO {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orderQueue: number;

  @ApiProperty({ enum: OrderType })
  orderType: OrderType;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  itemsSubtotal: number;

  @ApiProperty()
  deliveryFees: number;

  @ApiProperty()
  serviceFee: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ type: [PrintOrderItemDTO] })
  items: PrintOrderItemDTO[];
}

export class PrintShiftHeaderDTO {
  @ApiProperty()
  shiftId: number;

  @ApiProperty({ enum: ShiftStatus })
  status: ShiftStatus;

  @ApiProperty({ required: false })
  cashierName?: string;

  @ApiProperty()
  startShift?: Date;

  @ApiProperty({ required: false })
  endShift?: Date;

  @ApiProperty({ required: false })
  endMoney?: number;

  @ApiProperty({ required: false })
  actualEndMoney?: number;

  @ApiProperty({ required: false })
  totalOrders?: number;
}

export class PrintShiftRowDTO {
  @ApiProperty()
  id: number;

  @ApiProperty({ required: false })
  cashierName?: string;

  @ApiProperty({ enum: ShiftStatus })
  status: ShiftStatus;

  @ApiProperty()
  startShift?: Date;

  @ApiProperty({ required: false })
  endShift?: Date;

  @ApiProperty({ required: false })
  actualEndMoney?: number;
}

export class PrintEnvelopeDTO {
  @ApiProperty({ enum: ['SHIFT_ORDERS', 'BRANCH_KPIS', 'SUMMARY'] })
  kind: 'SHIFT_ORDERS' | 'BRANCH_KPIS' | 'SUMMARY';

  @ApiProperty()
  printedAt: string;

  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty({ required: false, nullable: true })
  branch?: {
    id: number;
    name: string;
    address?: string;
    phone?: string;
  } | null;

  @ApiProperty({ required: false })
  header?: PrintShiftHeaderDTO;

  @ApiProperty({ required: false })
  kpis?: StatisticsKpisDTO;

  @ApiProperty({ required: false })
  sections?: {
    orders?: PrintOrderRowDTO[];
    byOrderType?: StatisticsTypeBreakdownDTO[];
    byStatus?: StatisticsStatusBreakdownDTO[];
    topItems?: StatisticsTopItemDTO[];
    dailyTrend?: StatisticsDailyTrendDTO[];
    shifts?: PrintShiftRowDTO[];
    branches?: StatisticsBranchRowDTO[];
    totals?: StatisticsKpisDTO;
  };

  @ApiProperty()
  footer: { revenue: number; orderCount: number };
}
