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
import { AuthGuard, RolesGuard } from '../src/core/security';
import { OrderStatus } from '../src/core/enums/order-status';
import { OrderType } from '../src/core/enums/order-type';

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

describe('Order API (e2e)', () => {
  let app: INestApplication<App>;
  const orderService = {
    createOrder: jest.fn(),
    findById: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: orderService }],
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
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/v1/orders creates order with queue snapshot', async () => {
    orderService.createOrder.mockResolvedValue({
      id: 1,
      orderQueue: 3,
      deliveryFees: 0,
      serviceFee: 2,
      itemsSubtotal: 20,
      totalAmount: 22,
      status: OrderStatus.PENDING,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        orderType: OrderType.DINE_IN,
        items: [{ menuItemId: 10, quantity: 2, unitPrice: 20 }],
        itemsSubtotal: 40,
        deliveryFees: 0,
        serviceFee: 4,
        totalAmount: 44,
      })
      .expect(201);

    expect(response.body.orderQueue).toBe(3);
    expect(orderService.createOrder).toHaveBeenCalled();
  });

  it('GET /api/v1/orders/:id returns order', async () => {
    orderService.findById.mockResolvedValue({ id: 5, orderQueue: 1 });

    const response = await request(app.getHttpServer())
      .get('/api/v1/orders/5')
      .expect(200);

    expect(response.body.id).toBe(5);
  });

  it('GET /api/v1/orders/:id returns 404 when missing', async () => {
    orderService.findById.mockResolvedValue(undefined);

    await request(app.getHttpServer()).get('/api/v1/orders/999').expect(404);
  });
});
