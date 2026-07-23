import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Req,
  UseGuards,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, AuthUser } from 'src/core/security';
import { UserRole } from 'src/core/enums/user-role';
import type { Request } from 'src/core/utils/request';
import {
  buildSearchQuery,
  setPaginationHeaders,
} from 'src/core/utils/search-query.builder';
import { CustomerService } from './customer.service';
import { CustomerDTO } from './dtos/customer.dto';
import { CreateCustomerDTO } from './dtos/create-customer.dto';
import { UpdateCustomerDTO } from './dtos/update-customer.dto';
import { CustomerQueryDTO } from './dtos/customer-query.dto';
import { Customer } from './customer.entity';
import { User } from '../user/user.entity';
import { mapCustomerToCustomerDtoSelective } from './customer.mapper';
import { FindOptionsWhere, Like } from 'typeorm';
import { DeliveryRegionService } from '../delivery-region/delivery-region.service';

@Controller('customers')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.CALLCENTER,
  UserRole.CASHIER,
  UserRole.MANAGER,
)
@ApiTags('customers-module')
export class CustomerController {
  logger = new Logger('CustomerController');

  constructor(
    private readonly customerService: CustomerService,
    private readonly deliveryRegionService: DeliveryRegionService,
  ) {}

  private async ensureDefaultRegionExists(
    defaultDeliveryRegionId?: number,
  ): Promise<void> {
    if (defaultDeliveryRegionId === undefined) {
      return;
    }
    const region = await this.deliveryRegionService.findById(
      defaultDeliveryRegionId,
    );
    if (!region) {
      throw new NotFoundException(
        `Delivery region ${defaultDeliveryRegionId} not found`,
      );
    }
  }

  private async ensurePhoneIsUnique(
    phone: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.customerService.findByPhone(phone);
    if (existing && (excludeId === undefined || existing.id !== excludeId)) {
      throw new BadRequestException(`Customer with phone ${phone} already exists`);
    }
  }

  @Get('/')
  @ApiOperation({ summary: 'Get the list of customers paginated' })
  @ApiResponse({
    status: 200,
    description: 'List all customers',
    type: CustomerDTO,
    isArray: true,
  })
  async getAllCustomers(
    @Req() req: Request,
    @Query() query: CustomerQueryDTO,
  ): Promise<Partial<CustomerDTO>[]> {
    const where: FindOptionsWhere<Customer> = {};

    if (query.customerType !== undefined) {
      where.customerType = query.customerType;
    }


    const findOptions = buildSearchQuery<Customer>({
      query,
      searchableColumns: ['name', 'phone', 'alternativePhone', 'address'],
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: ['defaultDeliveryRegion'],
    });

    const [results, count] = await this.customerService.findAndCount(findOptions);

    setPaginationHeaders(req, count, query);
    return mapCustomerToCustomerDtoSelective(results);
  }

  @Get('by-phone/:phone')
  @ApiOperation({ summary: 'Get a customer by phone number' })
  @ApiResponse({ status: 200, type: CustomerDTO })
  async getByPhone(@Param('phone') phone: string): Promise<Partial<CustomerDTO>> {
    const customer = await this.customerService.findByPhone(phone);
    if (!customer) {
      throw new NotFoundException(`Customer with phone ${phone} not found`);
    }
    return mapCustomerToCustomerDtoSelective(customer);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiResponse({ status: 200, type: CustomerDTO })
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Partial<CustomerDTO>> {
    const customer = await this.customerService.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    return mapCustomerToCustomerDtoSelective(customer);
  }

  @Post('/')
  @Roles(UserRole.ADMIN, UserRole.CALLCENTER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, type: CustomerDTO })
  async create(
    @Body() dto: CreateCustomerDTO,
    @AuthUser() user: User,
  ): Promise<Customer> {
    await this.ensurePhoneIsUnique(dto.phone);
    await this.ensureDefaultRegionExists(dto.defaultDeliveryRegionId);
    return this.customerService.save(dto, user?.username);
  }

  @Put('/:id')
  @Roles(UserRole.ADMIN, UserRole.CALLCENTER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update an existing customer' })
  @ApiResponse({ status: 200, type: CustomerDTO })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDTO,
    @AuthUser() user: User,
  ): Promise<UpdateCustomerDTO> {
    const existing = await this.customerService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    if (dto.phone !== undefined && dto.phone !== existing.phone) {
      await this.ensurePhoneIsUnique(dto.phone, id);
    }
    await this.ensureDefaultRegionExists(dto.defaultDeliveryRegionId);
    dto.id = id;
    return this.customerService.update(dto, user?.username);
  }

  @Delete('/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiResponse({ status: 200 })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const existing = await this.customerService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    await this.customerService.delete(existing);
  }
}
