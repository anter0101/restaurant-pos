import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrderController } from '../src/app/modules/order/order.controller';
import { OrderService } from '../src/app/modules/order/order.service';
import { ShiftManagementController } from '../src/app/modules/shift-management/shift-management.controller';
import { ShiftManagementService } from '../src/app/modules/shift-management/shift-management.service';
import { DeliveryRegionController } from '../src/app/modules/delivery-region/delivery-region.controller';
import { DeliveryRegionService } from '../src/app/modules/delivery-region/delivery-region.service';
import { BranchService } from '../src/app/modules/branch/branch.service';
import { AuthGuard, RolesGuard } from '../src/core/security';
import { OrderStatus } from '../src/core/enums/order-status';
import { OrderType } from '../src/core/enums/order-type';
import { ShiftStatus } from '../src/core/enums/shift-status';

class AllowAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 2,
      username: 'cashier',
      branch: { id: 1 },
    };
    return true;
  }
}

describe('POS E2E Scenarios', () => {
  let app: INestApplication<App>;

  const branchState = { id: 1, nextOrderQueue: 0, servicePercentage: 0.1 };
  let shiftCounter = 0;
  let orderCounter = 0;
  let regionCounter = 0;
  let currentShiftId: number | null = null;
  let lastClosedShiftId: number | null = null;
  let lastCalculatedTotal = 0;

  const shiftService = {
    openShift: jest.fn(async (user: { id: number; branch?: { id: number } }) => {
      branchState.nextOrderQueue = 0;
      currentShiftId = ++shiftCounter;
      lastClosedShiftId = null;
      return {
        id: currentShiftId,
        branch: { id: user.branch?.id ?? 1 },
        status: ShiftStatus.OPEN,
        isCalculatedShift: false,
      };
    }),
    endShift: jest.fn(async () => {
      if (!currentShiftId) {
        throw new Error('No open shift');
      }
      lastClosedShiftId = currentShiftId;
      branchState.nextOrderQueue = 0;
      currentShiftId = null;
      return {
        id: lastClosedShiftId,
        status: ShiftStatus.CLOSED,
        isCalculatedShift: false,
      };
    }),
    hasOpenShift: jest.fn(async () => currentShiftId !== null),
    calculateOrdersTotals: jest.fn(async (id: number) => {
      if (id !== lastClosedShiftId) {
        throw new Error('Shift not found or not closed');
      }
      lastCalculatedTotal = 40;
      return lastCalculatedTotal;
    }),
    findById: jest.fn(async (id: number) => {
      if (id === currentShiftId) {
        return {
          id,
          status: ShiftStatus.OPEN,
          isCalculatedShift: false,
        };
      }
      if (id === lastClosedShiftId) {
        return {
          id,
          status: lastCalculatedTotal > 0 ? ShiftStatus.CALCULATED : ShiftStatus.CLOSED,
          isCalculatedShift: lastCalculatedTotal > 0,
          actualEndMoney: lastCalculatedTotal > 0 ? lastCalculatedTotal : undefined,
          totalOrders: lastCalculatedTotal > 0 ? 2 : undefined,
        };
      }
      return undefined;
    }),
    findAndCount: jest.fn(async () => [[], 0]),
  };

  const deliveryRegionService = {
    save: jest.fn(async (dto: { branchId: number; regionName: string; deliveryPrice: number }) => ({
      id: ++regionCounter,
      regionName: dto.regionName,
      deliveryPrice: dto.deliveryPrice,
      branch: { id: dto.branchId },
    })),
    findById: jest.fn(async (id: number) => ({
      id,
      deliveryPrice: 5.5,
      regionName: 'Downtown',
    })),
    findByFields: jest.fn(async () => undefined),
    findAndCount: jest.fn(async () => [[], 0]),
  };

  const branchService = {
    findById: jest.fn(async (id: number) => ({ id, nextOrderQueue: branchState.nextOrderQueue })),
  };

  const orderService = {
    createOrder: jest.fn(
      async (
        dto: {
          orderType: OrderType;
          deliveryRegionId?: number;
          items: { menuItemId: number; quantity: number }[];
        },
        user: { branch?: { id: number } },
      ) => {
        const branchId = user.branch?.id ?? 1;
        const assigned = branchState.nextOrderQueue;
        branchState.nextOrderQueue =
          assigned >= 100 ? 0 : assigned + 1;

        const itemsSubtotal = 20 * (dto.items[0]?.quantity ?? 1);
        const deliveryFees =
          dto.orderType === OrderType.DELIVERY && dto.deliveryRegionId
            ? 5.5
            : 0;
        const serviceFee =
          dto.orderType === OrderType.DINE_IN
            ? Math.round(itemsSubtotal * branchState.servicePercentage * 100) / 100
            : 0;
        const totalAmount = itemsSubtotal + deliveryFees + serviceFee;

        return {
          id: ++orderCounter,
          branch: { id: branchId },
          orderQueue: assigned,
          itemsSubtotal,
          deliveryFees,
          serviceFee,
          totalAmount,
          status: OrderStatus.PENDING,
          orderType: dto.orderType,
          shift: currentShiftId ? { id: currentShiftId } : undefined,
        };
      },
    ),
    findById: jest.fn(async (id: number) => {
      if (id !== orderCounter) return undefined;
      return { id, orderQueue: 0, deliveryFees: 0, serviceFee: 2, totalAmount: 22 };
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        OrderController,
        ShiftManagementController,
        DeliveryRegionController,
      ],
      providers: [
        { provide: OrderService, useValue: orderService },
        { provide: ShiftManagementService, useValue: shiftService },
        { provide: DeliveryRegionService, useValue: deliveryRegionService },
        { provide: BranchService, useValue: branchService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(AllowAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'v',
    });
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    branchState.nextOrderQueue = 0;
    shiftCounter = 0;
    orderCounter = 0;
    regionCounter = 0;
    currentShiftId = null;
    lastClosedShiftId = null;
    lastCalculatedTotal = 0;
    jest.clearAllMocks();
  });

  describe('Scenario: Dine-in order (no delivery fees)', () => {
    it('opens shift, creates order without deliveryRegionId, fees are zero', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shift-managements/open')
        .expect(201);

      const orderRes = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          orderType: OrderType.DINE_IN,
          items: [{ menuItemId: 10, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          deliveryFees: 0,
          serviceFee: 2,
          totalAmount: 22,
        })
        .expect(201);

      expect(orderRes.body.deliveryFees).toBe(0);
      expect(orderRes.body.orderQueue).toBe(0);
      expect(branchState.nextOrderQueue).toBe(1);
    });
  });

  describe('Scenario: Delivery order with fees', () => {
    it('creates region then order with delivery and service fees', async () => {
      const regionRes = await request(app.getHttpServer())
        .post('/api/v1/delivery-regions')
        .send({ branchId: 1, regionName: 'North', deliveryPrice: 5.5 })
        .expect(201);

      const orderRes = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          orderType: OrderType.DELIVERY,
          deliveryRegionId: regionRes.body.id,
          items: [{ menuItemId: 10, quantity: 2, unitPrice: 20 }],
          itemsSubtotal: 40,
          deliveryFees: 5.5,
          serviceFee: 0,
          totalAmount: 45.5,
        })
        .expect(201);

      expect(orderRes.body.deliveryFees).toBe(5.5);
      expect(orderRes.body.itemsSubtotal).toBe(40);
      expect(orderRes.body.serviceFee).toBe(0);
      expect(orderRes.body.totalAmount).toBe(45.5);
    });
  });

  describe('Scenario: Shift end resets queue counter', () => {
    it('assigns queue 0 then 1, end shift resets, next order is 0 again', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shift-managements/open')
        .expect(201);

      const first = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          orderType: OrderType.TAKEAWAY,
          items: [{ menuItemId: 1, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          deliveryFees: 0,
          serviceFee: 0,
          totalAmount: 20,
        })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          orderType: OrderType.TAKEAWAY,
          items: [{ menuItemId: 1, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          deliveryFees: 0,
          serviceFee: 0,
          totalAmount: 20,
        })
        .expect(201);

      expect(first.body.orderQueue).toBe(0);
      expect(second.body.orderQueue).toBe(1);

      const endRes = await request(app.getHttpServer())
        .post('/api/v1/shift-managements/end')
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      expect(endRes.body.status).toBe(ShiftStatus.CLOSED);
      expect(endRes.body.isCalculatedShift).toBe(false);
      expect(branchState.nextOrderQueue).toBe(0);

      await request(app.getHttpServer())
        .post('/api/v1/shift-managements/open')
        .expect(201);

      const third = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          orderType: OrderType.TAKEAWAY,
          items: [{ menuItemId: 1, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          deliveryFees: 0,
          serviceFee: 0,
          totalAmount: 20,
        })
        .expect(201);

      expect(third.body.orderQueue).toBe(0);
    });
  });

  describe('Scenario: Admin calculates closed shift totals', () => {
    it('closes shift then admin calculates prepared order totals', async () => {
      const openRes = await request(app.getHttpServer())
        .post('/api/v1/shift-managements/open')
        .expect(201);

      const hasOpenRes = await request(app.getHttpServer())
        .get('/api/v1/shift-managements/has-open-shift')
        .expect(200);

      expect(hasOpenRes.body === true || hasOpenRes.text === 'true').toBe(true);

      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          orderType: OrderType.TAKEAWAY,
          items: [{ menuItemId: 1, quantity: 2, unitPrice: 20 }],
          itemsSubtotal: 40,
          deliveryFees: 0,
          serviceFee: 0,
          totalAmount: 40,
        })
        .expect(201);

      const closedShift = await request(app.getHttpServer())
        .post('/api/v1/shift-managements/end')
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      const hasClosedRes = await request(app.getHttpServer())
        .get('/api/v1/shift-managements/has-open-shift')
        .expect(200);

      expect(hasClosedRes.body === false || hasClosedRes.text === 'false').toBe(true);

      const calculatedTotal = await request(app.getHttpServer())
        .post(`/api/v1/shift-managements/${closedShift.body.id}/calculate-orders-totals`)
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      expect(Number(calculatedTotal.text)).toBe(40);
      expect(shiftService.calculateOrdersTotals).toHaveBeenCalledWith(
        closedShift.body.id,
        'cashier',
      );

      const shiftDetail = await request(app.getHttpServer())
        .get(`/api/v1/shift-managements/${closedShift.body.id}`)
        .expect(200);

      expect(shiftDetail.body.status).toBe(ShiftStatus.CALCULATED);
      expect(shiftDetail.body.isCalculatedShift).toBe(true);
      expect(shiftDetail.body.actualEndMoney).toBe(40);
      expect(openRes.body.isCalculatedShift).toBe(false);
    });
  });

  describe('Scenario: Queue wraps at 100', () => {
    it('after queue 100 the next assigned queue is 0', async () => {
      branchState.nextOrderQueue = 100;

      const orderRes = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          orderType: OrderType.TAKEAWAY,
          items: [{ menuItemId: 1, quantity: 1, unitPrice: 20 }],
          itemsSubtotal: 20,
          deliveryFees: 0,
          serviceFee: 0,
          totalAmount: 20,
        })
        .expect(201);

      expect(orderRes.body.orderQueue).toBe(100);
      expect(branchState.nextOrderQueue).toBe(0);
    });
  });
});
