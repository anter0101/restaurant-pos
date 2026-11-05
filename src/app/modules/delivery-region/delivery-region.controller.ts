import {
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
  BadRequestException,
} from '@nestjs/common';
import { DeliveryRegionService } from './delivery-region.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, AuthUser } from 'src/core/security';
import { DeliveryRegionDTO } from './dtos/delivery-region.dto';
import { CreateDeliveryRegionDTO } from './dtos/create-delivery-region.dto';
import { UserRole } from 'src/core/enums/user-role';
import type { Request } from 'src/core/utils/request';
import {
  buildSearchQuery,
  setPaginationHeaders,
} from 'src/core/utils/search-query.builder';
import { mapDeliveryRegionToDeliveryRegionDtoSelective } from './delivery-region.mapper';
import { UpdateDeliveryRegionDTO } from './dtos/update-delivery-region.dto';
import { DeliveryRegion } from './delivery-region.entity';
import { DeliveryRegionQueryDTO } from './dtos/delivery-region-query.dto';
import { User } from '../user/user.entity';
import { BranchService } from '../branch/branch.service';
import { FindOptionsWhere } from 'typeorm';

@Controller('delivery-regions')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('delivery-regions-module')
export class DeliveryRegionController {
  logger = new Logger('DeliveryRegionController');

  constructor(
    private readonly deliveryRegionService: DeliveryRegionService,
    private readonly branchService: BranchService,
  ) {}

  private async ensureBranchExists(branchId: number): Promise<void> {
    const branch = await this.branchService.findById(branchId);
    if (!branch) {
      throw new NotFoundException(`Branch with id ${branchId} not found`);
    }
  }

  private async ensureRegionNameIsUniqueForBranch(
    branchId: number,
    regionName: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.deliveryRegionService.findByFields({
      where: { branch: { id: branchId }, regionName },
    });
    if (existing && (excludeId === undefined || existing.id !== excludeId)) {
      throw new BadRequestException(
        `Region "${regionName}" already exists for branch ${branchId}`,
      );
    }
  }

  @Get('/')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.CASHIER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get the list of delivery regions paginated' })
  @ApiResponse({
    status: 200,
    description: 'List all delivery regions',
    type: DeliveryRegionDTO,
    isArray: true,
  })
  async getAllDeliveryRegions(
    @Req() req: Request,
    @Query() query: DeliveryRegionQueryDTO,
    @AuthUser() user: User,
  ): Promise<Partial<DeliveryRegionDTO>[]> {
    const where: FindOptionsWhere<DeliveryRegion> = {};

    if (query.branchId !== undefined) {
      where.branch = { id: query.branchId };
    } else if (user.role !== UserRole.ADMIN && user.branch?.id) {
      where.branch = { id: user.branch.id };
    }

    const findOptions = buildSearchQuery<DeliveryRegion>({
      query,
      searchableColumns: ['regionName'],
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: ['branch'],
    });

    const [results, count] =
      await this.deliveryRegionService.findAndCount(findOptions);

    setPaginationHeaders(req, count, query);
    return mapDeliveryRegionToDeliveryRegionDtoSelective(results);
  }

  @Get('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a delivery region by id' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully retrieved.',
    type: DeliveryRegionDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getDeliveryRegionById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DeliveryRegion> {
    const existing = await this.deliveryRegionService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Delivery region with id ${id} not found`);
    }
    return existing;
  }

  @Post('/')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new delivery region' })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
    type: DeliveryRegionDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() dto: CreateDeliveryRegionDTO,
    @AuthUser() user: User,
  ): Promise<DeliveryRegion> {
    await this.ensureBranchExists(dto.branchId);
    await this.ensureRegionNameIsUniqueForBranch(dto.branchId, dto.regionName);
    return this.deliveryRegionService.save(dto, user?.username);
  }

  @Put('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing delivery region' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully updated.',
    type: DeliveryRegionDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() regionDTO: UpdateDeliveryRegionDTO,
    @AuthUser() user: User,
  ): Promise<UpdateDeliveryRegionDTO> {
    const existing = await this.deliveryRegionService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Delivery region with id ${id} not found`);
    }
    if (
      regionDTO.regionName !== undefined &&
      regionDTO.regionName !== existing.regionName
    ) {
      const branchId = existing.branch?.id;
      if (branchId === undefined) {
        throw new BadRequestException(
          `Delivery region ${id} has no associated branch`,
        );
      }
      await this.ensureRegionNameIsUniqueForBranch(
        branchId,
        regionDTO.regionName,
        id,
      );
    }
    regionDTO.id = id;
    return this.deliveryRegionService.update(regionDTO, user?.username);
  }

  @Delete('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a delivery region' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const existing = await this.deliveryRegionService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Delivery region with id ${id} not found`);
    }
    await this.deliveryRegionService.delete(existing);
  }
}
