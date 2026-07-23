import {

  Body,

  Controller,

  Get,

  Logger,

  NotFoundException,

  Param,

  ParseIntPipe,

  Post,

  Query,

  Req,

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

import { OrderDTO } from './dtos/order.dto';

import { OrderQueryDTO } from './dtos/order-query.dto';

import { User } from '../user/user.entity';

import { mapOrderToOrderDtoSelective } from './order.mapper';

import type { Request } from 'src/core/utils/request';

import {

  buildSearchQuery,

  setPaginationHeaders,

} from 'src/core/utils/search-query.builder';

import { Order } from './order.entity';

import { FindOptionsWhere } from 'typeorm';



@Controller('orders')

@ApiBearerAuth()

@UseGuards(AuthGuard, RolesGuard)


@ApiTags('orders-module')

export class OrderController {

  logger = new Logger('OrderController');



  constructor(private readonly orderService: OrderService) {}



  @Get('/')
  @Roles(UserRole.ADMIN)

  @ApiOperation({ summary: 'Get the list of orders paginated' })

  @ApiResponse({

    status: 200,

    description: 'List all orders',

    type: OrderDTO,

    isArray: true,

  })

  async getAllOrders(

    @Req() req: Request,

    @Query() query: OrderQueryDTO,

    @AuthUser() user: User,

  ): Promise<Partial<OrderDTO>[]> {

    const where: FindOptionsWhere<Order> = {};



    if (query.branchId !== undefined) {

      where.branch = { id: query.branchId };

    } else if (user.role !== UserRole.ADMIN && user.branch?.id) {

      where.branch = { id: user.branch.id };

    }

    if (query.shiftId !== undefined) {

      where.shift = { id: query.shiftId };

    }

    if (query.customerId !== undefined) {

      where.customer = { id: query.customerId };

    }

    if (query.status !== undefined) {

      where.status = query.status;

    }

    if (query.orderType !== undefined) {

      where.orderType = query.orderType;

    }



    const findOptions = buildSearchQuery<Order>({

      query,

      where: Object.keys(where).length > 0 ? where : undefined,

      relations: ['branch', 'items', 'shift', 'deliveryRegion', 'customer'],

    });



    const [results, count] = await this.orderService.findAndCount(findOptions);



    setPaginationHeaders(req, count, query);

    return mapOrderToOrderDtoSelective(results);

  }



  @Post('/')
  @Roles(UserRole.CASHIER)
  @ApiOperation({

    summary: 'Create an order with price and queue snapshots',

    description:

      'POS sends line unit prices and order totals; server recalculates and rejects mismatches. Branch and open shift from JWT. Service fee on DINE_IN only.',

  })

  @ApiResponse({ status: 201, type: OrderDTO })

  async create(

    @Body() dto: CreateOrderDTO,

    @AuthUser() user: User,

  ): Promise<Partial<OrderDTO>> {

    const order = await this.orderService.createOrder(dto, user);

    return mapOrderToOrderDtoSelective(order);

  }



  @Get('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get an order by id' })

  @ApiResponse({ status: 200, type: OrderDTO })

  async getById(

    @Param('id', ParseIntPipe) id: number,

  ): Promise<Partial<OrderDTO>> {

    const order = await this.orderService.findById(id);

    if (!order) {

      throw new NotFoundException(`Order with id ${id} not found`);

    }

    return mapOrderToOrderDtoSelective(order);

  }

}


