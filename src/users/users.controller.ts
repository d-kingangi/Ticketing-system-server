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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/schema/user.schema';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users') // Group endpoints under "Users" in Swagger UI
@Controller('users')
@ApiBearerAuth() // Indicates that JWT authentication is required for all endpoints
@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards to all endpoints in this controller
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Creates a new user. This endpoint is restricted to administrators.
   * It allows creating users with specific roles (e.g., AGENT, ADMIN).
   */
  @Post()
  @Roles(UserRole.ADMIN) // Only users with the ADMIN role can access this endpoint
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The user has been successfully created.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'A user with the provided email already exists.',
  })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Admin attempting to create user: ${createUserDto.email}`);
    // The service handles the creation logic, including password hashing.
    return this.usersService.create(createUserDto);
  }

  /**
   * Retrieves a paginated list of all users.
   * This endpoint is restricted to administrators for user management purposes.
   */
  @Get()
  @Roles(UserRole.ADMIN) // Only ADMINs can view the full list of users
  @ApiOperation({ summary: 'Get all users with pagination and filtering (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users retrieved successfully.',
    type: PaginatedResponseDto<UserResponseDto>,
  })
  findAll(
    @Query() query: FindAllUsersQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    // The service handles all filtering, sorting, and pagination logic.
    return this.usersService.findAll(query);
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   */
  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER) // Any authenticated user can get their own profile
  @ApiOperation({ summary: 'Get the current authenticated user\'s profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully.',
    type: UserResponseDto,
  })
  getMe(@GetUser('_id') userId: string): Promise<UserResponseDto> {
    this.logger.log(`User ${userId} fetching their own profile.`);
    // The findOne method is reused to get the user's own data.
    return this.usersService.findOne(userId);
  }

  /**
   * Retrieves a single user by their ID.
   * Restricted to administrators to view any user's profile.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN) // Only ADMINs can get any user by ID
  @ApiOperation({ summary: 'Get a single user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the user to retrieve.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }
    return this.usersService.findOne(id);
  }

  /**
   * Updates a user's information.
   * - Admins can update any user's profile.
   * - Customers and Agents can only update their own profile.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER) // All roles can potentially update
  @ApiOperation({ summary: 'Update a user\'s profile' })
  @ApiParam({ name: 'id', description: 'The ID of the user to update.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this user.',
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser('_id') authenticatedUserId: string,
    @GetUser('roles') authenticatedUserRoles: UserRole[],
  ): Promise<UserResponseDto> {
    const isAdmin = authenticatedUserRoles.includes(UserRole.ADMIN);

    // Authorization check:
    // 1. An admin can update any user.
    // 2. A non-admin can only update their own profile.
    if (!isAdmin && id !== authenticatedUserId) {
      throw new ForbiddenException('You can only update your own profile.');
    }

    // Field restriction for non-admins:
    // Even when updating their own profile, non-admins cannot change their roles,
    // verification status, or active status.
    if (!isAdmin) {
      delete updateUserDto.roles;
      delete updateUserDto.isActive;
      delete updateUserDto.isVerified;
    }

    this.logger.log(`User ${authenticatedUserId} attempting to update user ${id}.`);
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Soft-deletes a user. This is a recoverable action.
   * Restricted to administrators.
   */
  @Delete(':id/soft')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete a user (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the user to soft-delete.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully soft-deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.softDelete(id);
  }

  /**
   * Restores a soft-deleted user.
   * Restricted to administrators.
   */
  @Post(':id/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted user (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the user to restore.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully restored.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  restore(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.restore(id);
  }

  /**
   * Permanently deletes a user. This action is irreversible.
   * Restricted to administrators. Use with extreme caution.
   */
  @Delete(':id/hard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete a user (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the user to permanently delete.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully permanently deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  hardDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.hardDelete(id);
  }

  /**
   * Assigns roles to a user.
   * Restricted to administrators.
   */
  @Patch(':id/roles')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign roles to a user (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the user to assign roles to.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string', enum: Object.values(UserRole) },
        },
      },
      required: ['roles'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User roles successfully updated.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  assignRoles(
    @Param('id') id: string,
    @Body('roles') roles: UserRole[],
  ): Promise<UserResponseDto> {
    return this.usersService.assignRoles(id, roles);
  }
}
