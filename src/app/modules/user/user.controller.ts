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
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, AuthUser } from 'src/core/security';
import { UserDTO } from './dtos/user.dto';
import { CreateUserDTO } from './dtos/create-user.dto';
import { UserRole } from 'src/core/enums/user-role';
import type { Request } from 'src/core/utils/request';
import { buildSearchQuery, setPaginationHeaders } from 'src/core/utils/search-query.builder';
import { mapCreateUserDtoToEntity, mapUpdateUserDtoToEntity, mapUserToUserDtoSelective } from './user.mapper';
import { UpdateUserDTO } from './dtos/update-user.dto';
import { User } from './user.entity';
import { UserQueryDTO } from './dtos/user-query.dto';
import { BranchService } from '../branch/branch.service';

@Controller('users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('users-module')
export class UserController {
  logger = new Logger('UsersController');

  constructor(
    private readonly userService: UserService,
    private readonly branchService: BranchService,
  ) {}

  private async ensureBranchExistsWhenProvided(
    branchId: number | null | undefined,
  ): Promise<void> {
    if (branchId == null) {
      return;
    }
    const branch = await this.branchService.findById(branchId);
    if (!branch) {
      throw new BadRequestException(`Branch with id ${branchId} not found`);
    }
  }

  private async ensureUsernameIsUnique(username: string): Promise<void> {
    const existing = await this.userService.findByFields({
      where: { username: username },
    });
    if (existing) {
      throw new BadRequestException(`Username ${username} already exists`);
    }
  }

  private async ensurePhoneIsUnique(phone: string): Promise<void> {
    const existing = await this.userService.findByFields({
      where: { phone: phone },
    });
    if (existing) {
      throw new BadRequestException(`Phone ${phone} already exists`);
    }
  }

  @Get('/')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get the list of users paginated' })
  @ApiResponse({
    status: 200,
    description: 'List all users',
    type: UserDTO,
    isArray: true,
  })
  async getAllUsers(
    @Req() req: Request,
    @Query() query: UserQueryDTO,
  ): Promise<Partial<UserDTO>[]> {
    const findOptions = buildSearchQuery<User>({
      query,
      searchableColumns: ['name', 'username', 'phone'],
      relations: ['branch'],
    });

    const [results, count] =
      await this.userService.findAndCount(findOptions);

    setPaginationHeaders(req, count, query);
    return mapUserToUserDtoSelective(results);
  }


  @Get('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully retrieved.',
    type: UserDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<Partial<UserDTO> | undefined> {
    const existing = await this.userService.findById(id);
    if (!existing) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return mapUserToUserDtoSelective(existing);
  }

  @Post('/')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
    type: UserDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() userDTO: CreateUserDTO,
    @AuthUser() user: User,
  ): Promise<User> {

    if(userDTO.username !== undefined) {
      await this.ensureUsernameIsUnique(userDTO.username);
    }
    if(userDTO.phone !== undefined) {
      await this.ensurePhoneIsUnique(userDTO.phone);
    }
    if(userDTO.branchId !== undefined) {
      await this.ensureBranchExistsWhenProvided(userDTO.branchId);
    }

    const userEntity = mapCreateUserDtoToEntity(userDTO);
    const created = await this.userService.save(userEntity, user?.username, true);
    return created;
  }

  @Put('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully updated.',
    type: UserDTO,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() userDTO: UpdateUserDTO,
    @AuthUser() user: User,
    ): Promise<User> {
    
    const existing = await this.userService.findById(id);
    if (!existing) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
   
    if(userDTO.username !== undefined) {
      await this.ensureUsernameIsUnique(userDTO.username);
    }
    if(userDTO.phone !== undefined) {
      await this.ensurePhoneIsUnique(userDTO.phone);
    }
    if(userDTO.branchId !== undefined) {
      await this.ensureBranchExistsWhenProvided(userDTO.branchId);
    }

    const userEntity = mapUpdateUserDtoToEntity(userDTO);
    userEntity.id = id;
    const updated = await this.userService.update(userEntity, user?.username);
    return updated;
  }

  @Delete('/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async delete(@Param('id') id: number): Promise<void> {
    const existing = await this.userService.findById(id);
    if (!existing) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    await this.userService.delete(existing);
  }
}
