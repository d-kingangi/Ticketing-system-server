import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Types } from 'mongoose'; // Import Types for ObjectId validation
import { EventCategoryService } from './event-category.service';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { EventCategoryResponseDto } from './dto/event-category-response.dto';
import { FindAllEventCategoriesQueryDto } from './dto/find-all-event-categories-query.dto';
import { GetUser } from '../auth/decorators/get-user.decorator'; // To get authenticated user's ID
import { Roles } from '../auth/decorators/roles.decorator'; // For role-based access control
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // For authentication
import { RolesGuard } from '../auth/guards/roles.guard'; // For role-based authorization
import { UserRole } from '../auth/schema/user.schema'; // User roles enum
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';

@ApiTags('Event Categories') // Group endpoints under "Event Categories" in Swagger UI
@Controller('event-categories') // Use plural for RESTful consistency
@ApiBearerAuth() // Indicates that JWT authentication is required for all endpoints in this controller
@UseGuards(JwtAuthGuard, RolesGuard) // Apply authentication and role guards to all endpoints
export class EventCategoryController {
  private readonly logger = new Logger(EventCategoryController.name);

  constructor(private readonly eventCategoryService: EventCategoryService) {}

  /**
   * Creates a new event category.
   * This endpoint is restricted to administrators as categories are global.
   */
  @Post()
  @Roles(UserRole.ADMIN) // Only users with the ADMIN role can create categories
  @ApiOperation({ summary: 'Create a new event category (Admin only)' })
  @ApiBody({ type: CreateEventCategoryDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The event category has been successfully created.',
    type: EventCategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'An event category with the provided name already exists.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  async create(
    @Body() createEventCategoryDto: CreateEventCategoryDto,
    @GetUser('_id') userId: string, // Get the ID of the authenticated user for audit trail
  ): Promise<EventCategoryResponseDto> {
    this.logger.log(`Admin ${userId} attempting to create event category: ${createEventCategoryDto.name}`);
    // The service handles the creation logic, including uniqueness checks.
    // Since organizationId is not in the schema, it's not passed here.
    return this.eventCategoryService.create(createEventCategoryDto, userId);
  }

  /**
   * Retrieves a paginated list of all event categories.
   * Accessible by all authenticated users as categories are used for filtering events.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER) // All authenticated users can view categories
  @ApiOperation({ summary: 'Get all event categories with pagination and filtering' })
  @ApiQuery({ type: FindAllEventCategoriesQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of event categories retrieved successfully.',
    type: PaginatedResponseDto<EventCategoryResponseDto>,
  })
  async findAll(
    @Query() query: FindAllEventCategoriesQueryDto,
  ): Promise<PaginatedResponseDto<EventCategoryResponseDto>> {
    this.logger.log(`Fetching all event categories with query: ${JSON.stringify(query)}`);
    // The service handles all filtering, sorting, and pagination logic.
    return this.eventCategoryService.findAll(query);
  }

  /**
   * Retrieves a single event category by its ID.
   * Accessible by all authenticated users.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER) // All authenticated users can view a single category
  @ApiOperation({ summary: 'Get a single event category by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the event category to retrieve.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event category retrieved successfully.',
    type: EventCategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event category not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid event category ID format.',
  })
  async findOne(@Param('id') id: string): Promise<EventCategoryResponseDto> {
    this.logger.log(`Fetching event category with ID: ${id}`);
    // Validate ID format before passing to service
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }
    return this.eventCategoryService.findOne(id);
  }

  /**
   * Updates an existing event category.
   * This endpoint is restricted to administrators.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN) // Only ADMINs can update categories
  @ApiOperation({ summary: 'Update an event category (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the event category to update.' })
  @ApiBody({ type: UpdateEventCategoryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event category updated successfully.',
    type: EventCategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event category not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'An event category with the updated name already exists.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or ID format.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateEventCategoryDto: UpdateEventCategoryDto,
    @GetUser('_id') userId: string, // Get the ID of the authenticated user for audit trail
  ): Promise<EventCategoryResponseDto> {
    this.logger.log(`Admin ${userId} attempting to update event category with ID: ${id}`);
    // Validate ID format before passing to service
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }
    return this.eventCategoryService.update(id, updateEventCategoryDto, userId);
  }

  /**
   * Soft-deletes an event category. This is a recoverable action.
   * Restricted to administrators.
   */
  @Delete(':id/soft')
  @Roles(UserRole.ADMIN) // Only ADMINs can soft delete categories
  @ApiOperation({ summary: 'Soft delete an event category (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the event category to soft-delete.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event category successfully soft-deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event category not found or already soft-deleted.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid event category ID format.',
  })
  async softDelete(
    @Param('id') id: string,
    @GetUser('_id') userId: string, // Get the ID of the authenticated user for audit trail
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${userId} attempting to soft-delete event category with ID: ${id}`);
    // Validate ID format before passing to service
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }
    return this.eventCategoryService.softDelete(id, userId);
  }

  /**
   * Restores a soft-deleted event category.
   * Restricted to administrators.
   */
  @Post(':id/restore')
  @Roles(UserRole.ADMIN) // Only ADMINs can restore categories
  @ApiOperation({ summary: 'Restore a soft-deleted event category (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the event category to restore.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event category successfully restored.',
    type: EventCategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event category not found or not in a soft-deleted state.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid event category ID format.',
  })
  async restore(
    @Param('id') id: string,
    @GetUser('_id') userId: string, // Get the ID of the authenticated user for audit trail
  ): Promise<EventCategoryResponseDto> {
    this.logger.log(`Admin ${userId} attempting to restore event category with ID: ${id}`);
    // Validate ID format before passing to service
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }
    return this.eventCategoryService.restore(id, userId);
  }

  /**
   * Permanently deletes an event category. This action is irreversible.
   * Restricted to administrators. Use with extreme caution.
   */
  @Delete(':id/hard')
  @Roles(UserRole.ADMIN) // Only ADMINs can hard delete categories
  @ApiOperation({ summary: 'Permanently delete an event category (ADMIN ONLY)' })
  @ApiParam({ name: 'id', description: 'The ID of the event category to permanently delete.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event category successfully permanently deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event category not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid event category ID format.',
  })
  async hardDelete(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Admin attempting to permanently delete event category with ID: ${id}`);
    // Validate ID format before passing to service
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }
    return this.eventCategoryService.hardDelete(id);
  }
}
