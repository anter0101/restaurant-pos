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
import { PageRequest } from 'src/core/utils/pagination.entity';
import { HeaderUtil } from 'src/core/utils/header-util';
import type { Request } from 'src/core/utils/request';
import { mapBranchToBranchDtoSelective } from './branch.mapper';
import { UpdateBranchDTO } from './dtos/update-branch.dto';
import { Branch } from './branch.entity';
import { BranchQueryDTO } from './dtos/branch-query.dto';
import { User } from '../user/user.entity';

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
  @Roles(UserRole.ADMIN, UserRole.USER)
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
  ): Promise<Partial<BranchDTO>[]> {
    const pageRequest: PageRequest = new PageRequest(
      +(query.page ?? 1),
      +(query.pageSize ?? 10),
      query.sortField ? `${query.sortField},${query.sortOrder || 'ASC'}` : '',
    );

    const [results, count] = await this.branchService.findAndCount({
      skip: +pageRequest.page * pageRequest.size,
      take: +pageRequest.size,
      order: pageRequest.sort.asOrder(),
    });

    const branchDtos = mapBranchToBranchDtoSelective(results);

    HeaderUtil.addPaginationHeaders(
      req.res!,
      count,
      pageRequest.page,
      count > pageRequest.page * pageRequest.size,
    );

    return branchDtos;
  }

  @Get('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a branch by id' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully retrieved.',
    type: BranchDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getBranchById(@Param('id', ParseIntPipe) id: number): Promise<Branch> {
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
    if(branchDTO.name !== undefined) {
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
