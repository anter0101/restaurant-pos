import {

  Body,

  Controller,

  Get,

  Logger,

  NotFoundException,

  Param,

  ParseIntPipe,

  Post,

  Put,

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

import { ShiftManagementService } from './shift-management.service';

import {

  EndShiftDTO,

  OpenShiftDTO,

  ShiftManagementDTO,

} from './dtos/shift-management.dto';

import { ShiftManagementQueryDTO } from './dtos/shift-management-query.dto';

import { ShiftManagement } from './shift-management.entity';

import { User } from '../user/user.entity';

import type { Request } from 'src/core/utils/request';

import {

  buildSearchQuery,

  setPaginationHeaders,

} from 'src/core/utils/search-query.builder';

import { mapShiftManagementToShiftManagementDtoSelective } from './shift-management.mapper';

import { FindOptionsWhere } from 'typeorm';



@Controller('shift-managements')

@ApiBearerAuth()

@UseGuards(AuthGuard, RolesGuard)

@Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.MANAGER)

@ApiTags('shift-managements-module')

export class ShiftManagementController {

  logger = new Logger('ShiftManagementController');



  constructor(private readonly shiftManagementService: ShiftManagementService) {}



  @Get('/')

  @ApiOperation({ summary: 'Get the list of shifts paginated' })

  @ApiResponse({

    status: 200,

    description: 'List all shifts',

    type: ShiftManagementDTO,

    isArray: true,

  })

  @Roles(UserRole.ADMIN)

  async getAllShifts(

    @Req() req: Request,

    @Query() query: ShiftManagementQueryDTO,

    @AuthUser() user: User,

  ): Promise<Partial<ShiftManagementDTO>[]> {

    const where: FindOptionsWhere<ShiftManagement> = {};



    if (query.branchId !== undefined) {

      where.branch = { id: query.branchId };

    } else if (user.role !== UserRole.ADMIN && user.branch?.id) {

      where.branch = { id: user.branch.id };

    }

    if (query.cashierId !== undefined) {

      where.cashier = { id: query.cashierId };

    }

    if (query.status !== undefined) {

      where.status = query.status;

    }



    const findOptions = buildSearchQuery<ShiftManagement>({

      query,

      where: Object.keys(where).length > 0 ? where : undefined,

      relations: ['branch', 'cashier'],

    });



    const [results, count] =

      await this.shiftManagementService.findAndCount(findOptions);



    setPaginationHeaders(req, count, query);

    return mapShiftManagementToShiftManagementDtoSelective(results);

  }



  @Post('open')

  @Roles(UserRole.ADMIN)

  @ApiOperation({

    summary: 'Open a shift for a cashier (admin only)',

    description:

      'Branch is resolved from the cashier user. Resets branch order queue counter.',

  })

  @ApiResponse({ status: 201, type: ShiftManagement })

  async openShift(

    @Body() dto: OpenShiftDTO,

    @AuthUser() user: User,

  ): Promise<ShiftManagement> {

    return this.shiftManagementService.openShift(dto, user?.username);

  }



  @Put(':id/end')

  @ApiOperation({

    summary: 'Close a shift, end prepared orders, reset queue counter',

  })

  @ApiResponse({ status: 200, type: ShiftManagement })
  @Roles(UserRole.ADMIN)

  async endShift(

    @Param('id', ParseIntPipe) id: number,

    @Body() dto: EndShiftDTO,

    @AuthUser() user: User,

  ): Promise<ShiftManagement> {

    return this.shiftManagementService.endShift(id, dto, user?.username);

  }



  @Get(':id')

  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a shift by id' })

  @ApiResponse({ status: 200, type: ShiftManagementDTO })

  async getById(

    @Param('id', ParseIntPipe) id: number,

  ): Promise<Partial<ShiftManagementDTO>> {

    const shift = await this.shiftManagementService.findById(id);

    if (!shift) {

      throw new NotFoundException(`Shift with id ${id} not found`);

    }

    return mapShiftManagementToShiftManagementDtoSelective(shift);

  }

}


