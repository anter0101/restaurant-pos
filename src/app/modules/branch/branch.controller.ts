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
import { BranchService } from './branch.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, AuthUser } from 'src/core/security';
import { BranchDTO } from './dtos/branch.dto';
import { CreateBranchDTO } from './dtos/create-branch.dto';
import { UserRole } from 'src/core/enums/user-role';
import type { Request } from 'src/core/utils/request';
import { buildSearchQuery, setPaginationHeaders } from 'src/core/utils/search-query.builder';
import { mapBranchToBranchDtoSelective } from './branch.mapper';
import { UpdateBranchDTO } from './dtos/update-branch.dto';
import { Branch } from './branch.entity';
import { BranchQueryDTO } from './dtos/branch-query.dto';
import { User } from '../user/user.entity';
import { FindOptionsWhere } from 'typeorm';

@Controller('branches')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('branches-module')
export class BranchController {
  logger = new Logger('BranchController');

  constructor(private readonly branchService: BranchService) {}


  private async ensureBranchNameIsUnique(name: string): Promise<void> {
    const existing = await this.branchService.findByFields({
      where: { name: name },
    });
    if (existing) {
      throw new BadRequestException(`Branch with name ${name} already exists`);
    }
  }
  

  @Get('/')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.CASHIER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get the list of branches paginated' })
  @ApiResponse({
    status: 200,
    description: 'List all branches',
    type: BranchDTO,
    isArray: true,
  })
  async getAllBranches(
    @Req() req: Request,
    @Query() query: BranchQueryDTO,
    @AuthUser() user: User,
  ): Promise<Partial<BranchDTO>[]> {
    const where: FindOptionsWhere<Branch> = {};

    if (user.role !== UserRole.ADMIN && user.branch?.id) {
      where.id = user.branch.id;
    }

    const findOptions = buildSearchQuery<Branch>({
      query,
      searchableColumns: ['name', 'address', 'phone'],
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    const [results, count] =
      await this.branchService.findAndCount(findOptions);

    setPaginationHeaders(req, count, query);
    return mapBranchToBranchDtoSelective(results);
  }

  @Get('/:id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a branch by id' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully retrieved.',
    type: BranchDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getBranchById(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: User,
  ): Promise<Branch> {
    if (
      user.role !== UserRole.ADMIN &&
      user.branch?.id !== undefined &&
      user.branch.id !== id
    ) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }

    const existing = await this.branchService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }
    return existing;
  }

  @Post('/')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
    type: BranchDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() dto: CreateBranchDTO,
    @AuthUser() user: User,
  ): Promise<Branch> {
    await this.ensureBranchNameIsUnique(dto.name);
    return this.branchService.save(dto, user?.username);
  }

  @Put('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing branch' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully updated.',
    type: BranchDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() branchDTO: UpdateBranchDTO,
    @AuthUser() user: User,
  ): Promise<UpdateBranchDTO> {
    const existing = await this.branchService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    } 
    if (
      branchDTO.name !== undefined &&
      branchDTO.name !== existing.name
    ) {
      await this.ensureBranchNameIsUnique(branchDTO.name);
    }
    branchDTO.id = id;
    return this.branchService.update(branchDTO, user?.username);
  }

  @Delete('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const existing = await this.branchService.findById(id);
    if (!existing) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }
    await this.branchService.delete(existing);
  }
}
