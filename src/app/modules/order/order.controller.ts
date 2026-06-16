import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
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
import { OrderService } from './order.service';
import { CreateOrderDTO } from './dtos/create-order.dto';
import { Order } from './order.entity';
import { User } from '../user/user.entity';

@Controller('orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.MANAGER)
@ApiTags('orders-module')
export class OrderController {
  logger = new Logger('OrderController');

  constructor(private readonly orderService: OrderService) {}

  @Post('/')
  @ApiOperation({ summary: 'Create an order with price and queue snapshots' })
  @ApiResponse({ status: 201, type: Order })
  async create(
    @Body() dto: CreateOrderDTO,
    @AuthUser() user: User,
  ): Promise<Order> {
    return this.orderService.createOrder(dto, user?.username);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiResponse({ status: 200, type: Order })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    const order = await this.orderService.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return order;
  }
}
