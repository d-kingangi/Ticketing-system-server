import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { GetClient } from 'src/auth/decorators/get-client.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ClientAccessGuard } from 'src/auth/guards/client-access.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OwnershipGuard } from 'src/auth/guards/ownership.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/auth/schema/user.schema';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './user-query.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Only ADMIN can create users
  async create(
    @Body() createUserDto: CreateUserDto,
    @GetClient() clientId: string,
  ) {
    // If the request is from a client admin, ensure the user is created for their client
    if (clientId) {
      createUserDto.clientId = clientId;
    }

    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard, ClientAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT) // Assuming AGENT covers Doctor, Nurse, Receptionist
  async findAll(
    @Query() query: UserQueryDto,
    @GetClient() clientId: string,
    @GetUser('roles') userRoles: UserRole[], // Changed from 'role' to 'roles' (array)
  ) {
    if (!userRoles.includes(UserRole.ADMIN) || clientId) {
      query.clientId = clientId;
    }

    return this.usersService.findAll(query);
  }

  @Get('count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async count(
    @Query('clientId') clientId: string,
    @Query('role') role: UserRole,
    @GetClient() userClientId: string,
    @GetUser('role') userRole: UserRole,
  ) {
    // If user is not a system admin, enforce client isolation
    if (userRole !== UserRole.ADMIN || userClientId) {
      clientId = userClientId;
    }

    return this.usersService.count(clientId, role);
  }

  @Get(':id')
  @UseGuards(RolesGuard, OwnershipGuard)
  async findOne(
    @Param('id') id: string,
    @GetClient() clientId: string,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[], // Changed from 'role' to 'roles' (array)
  ) {
    // Enforce client isolation and ownership
    // System admins can access any user
    // AGENTs can access any user within their client (e.g., patient data)
    // Other roles (like CUSTOMER) can only access their own user data
    if (
      !userRoles.includes(UserRole.ADMIN) &&
      !userRoles.includes(UserRole.AGENT) && // Allow AGENT to access other users
      id !== userId // If not admin/agent, must be accessing own ID
    ) {
      throw new BadRequestException('You can only access your own user data');
    }

    return this.usersService.findOne(id, clientId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard, OwnershipGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetClient() clientId: string,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[], // Changed from 'role' to 'roles' (array)
  ) {
    // Enforce client isolation and ownership
    // System admins can update any user
    // Other roles can only update their own user (and restricted fields)
    // Check if userRoles includes ADMIN
    if (!userRoles.includes(UserRole.ADMIN) && id !== userId) {
      throw new BadRequestException('You can only update your own user data');
    }

    // Remove sensitive fields for non-admin users, even if they are updating themselves
    // Check if userRoles includes ADMIN
    if (!userRoles.includes(UserRole.ADMIN) && id === userId) {
      delete updateUserDto.roles; // Changed from 'role' to 'roles'
      delete updateUserDto.isActive;
      delete updateUserDto.clientId;
    }

    return this.usersService.update(id, updateUserDto, clientId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @GetClient() clientId: string) {
    // Only admins can delete users
    return this.usersService.remove(id, clientId);
  }

  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async restore(@Param('id') id: string, @GetClient() clientId: string) {
    // Only admins can restore users
    return this.usersService.restore(id, clientId);
  }

  @Get('client/:clientId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findByClient(
    @Param('clientId') clientId: string,
    @Query() query: UserQueryDto,
    @GetClient() userClientId: string,
    @GetUser('role') userRole: UserRole,
  ) {
    // If user is not a system admin, enforce client isolation
    if (userRole !== UserRole.ADMIN && userClientId) {
      if (clientId !== userClientId) {
        throw new BadRequestException(
          'You can only access users from your own client',
        );
      }
    }

    query.clientId = clientId;
    return this.usersService.findAll(query);
  }
}
