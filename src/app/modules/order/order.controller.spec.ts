import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderStatus } from 'src/core/enums/order-status';
import { OrderType } from 'src/core/enums/order-type';
import { User } from '../user/user.entity';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: {
    createOrder: jest.Mock;
    findById: jest.Mock;
    findAndCount: jest.Mock;
  };

  const cashierUser = {
    id: 2,
    username: 'cashier',
    branch: { id: 1 },
  } as User;

  beforeEach(async () => {
    orderService = {
      createOrder: jest.fn(),
      findById: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: orderService }],
    }).compile();

    controller = module.get(OrderController);
  });

  it('create delegates to OrderService with authenticated user', async () => {
    const dto = {
      orderType: OrderType.DINE_IN,
      items: [{ menuItemId: 2, quantity: 1, unitPrice: 20 }],
      itemsSubtotal: 20,
      deliveryFees: 0,
      serviceFee: 0,
      totalAmount: 20,
    };
    const saved = {
      id: 10,
      orderQueue: 0,
      deliveryFees: 0,
      serviceFee: 0,
      status: OrderStatus.PENDING,
      orderType: OrderType.DINE_IN,
      itemsSubtotal: 20,
      totalAmount: 20,
    };
    orderService.createOrder.mockResolvedValue(saved);

    const result = await controller.create(dto, cashierUser);

    expect(orderService.createOrder).toHaveBeenCalledWith(dto, cashierUser);
    expect(result.id).toBe(10);
    expect(result.orderQueue).toBe(0);
  });

  it('getAllOrders delegates to OrderService', async () => {
    orderService.findAndCount.mockResolvedValue([[{ id: 1 }], 1]);
    const req = { res: { set: jest.fn() } } as any;

    const result = await controller.getAllOrders(
      req,
      { page: 1, pageSize: 10 },
      cashierUser,
    );

    expect(orderService.findAndCount).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('getById throws when order missing', async () => {
    orderService.findById.mockResolvedValue(undefined);

    await expect(controller.getById(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
