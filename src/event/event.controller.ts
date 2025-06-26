import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, Logger, Query, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiBearerAuth, ApiOperation, ApiBody, ApiResponse, ApiQuery, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator'; // Corrected import path for Roles decorator
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/schema/user.schema';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { FindAllEventsQueryDto } from './dto/find-all-events-query.dto';
import { GetOrganizationId } from '../auth/decorators/get-organization-id.decorator'; // Import the new decorator

@ApiTags('Events') // Group endpoints under "Events" in Swagger UI
@Controller('events') // Changed to plural for consistency
@ApiBearerAuth() // Requires authentication for all endpoints
@UseGuards(JwtAuthGuard)
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Restrict to agents and admins
  @ApiOperation({ summary: 'Create a new event' })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event successfully created.',
    type: EventResponseDto,
  })
  async create(
    @Body() createEventDto: CreateEventDto,
    @GetUser('_id') userId: string, // Inject the ID of the authenticated user
    @GetUser('roles') userRoles: UserRole[],
    @GetOrganizationId() authenticatedOrganizationId: string, // Get organizationId from the authenticated user's token
  ): Promise<EventResponseDto> {
    let targetOrganizationId: string;

    // Admins can create events for any organization (if organizationId is provided in DTO)
    // Agents can only create events for their own organization.
    if (userRoles.includes(UserRole.ADMIN)) {
      targetOrganizationId = createEventDto.organizationId || authenticatedOrganizationId;
    } else {
      // For agents, enforce that the event is created for their own organization
      if (!authenticatedOrganizationId) {
        throw new BadRequestException('Agent must be associated with an organization to create events.');
      }
      if (createEventDto.organizationId && createEventDto.organizationId !== authenticatedOrganizationId) {
        throw new ForbiddenException('Agents can only create events for their own organization.');
      }
      targetOrganizationId = authenticatedOrganizationId;
    }

    // Call the service to create the event
    return this.eventService.create(createEventDto, userId, targetOrganizationId);
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all public events' })
  @ApiQuery({ type: FindAllEventsQueryDto }) // For pagination, sorting, filtering
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of public events.',
    type: PaginatedResponseDto<EventResponseDto>,
  })
  async findAllPublic(
    @Query() query: FindAllEventsQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    return this.eventService.findAllPublic(query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Only agents and admins can use this endpoint
  @ApiOperation({ summary: 'Get all events for a specific organization' })
  @ApiQuery({ type: FindAllEventsQueryDto }) // For pagination, sorting, filtering
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of events for the organization.',
    type: PaginatedResponseDto<EventResponseDto>,
  })
  async findAllByOrganization(
    @Query() query: FindAllEventsQueryDto,
    @GetOrganizationId() organizationId: string, // Inject orgId from token
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    // The service will filter by the organizationId provided by the decorator.
    return this.eventService.findAllByOrganization(organizationId, query);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get a single public event by ID' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the event' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event details.',
    type: EventResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found.' })
  async findOnePublic(@Param('id') id: string): Promise<EventResponseDto> {
    return this.eventService.findOnePublic(id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Only agents and admins can use this endpoint
  @ApiOperation({ summary: 'Get an event by ID for a specific organization' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the event' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Whether to include soft-deleted records',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event details.',
    type: EventResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found.' })
  async findOne( // Renamed from findOneByOrganization for consistency with service
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted: boolean = false,
    @GetOrganizationId() organizationId: string, // Enforce access to the user's organization only
  ): Promise<EventResponseDto> {
    // The service method `findOne` now handles the organization check.
    return this.eventService.findOne(id, organizationId, includeDeleted);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Restrict to agents and admins
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the event' })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event successfully updated.',
    type: EventResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to update this event.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<EventResponseDto> {
    // The service method `update` now handles the organization check.
    return this.eventService.update(id, updateEventDto, userId, organizationId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Restrict to agents and admins
  @ApiOperation({ summary: 'Soft delete an event' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event successfully soft-deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to delete this event.',
  })
  async softDelete(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<{ message: string }> {
    // The service method `softDelete` now handles the organization check.
    return this.eventService.softDelete(id, userId, organizationId);
  }

  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Restrict to agents and admins
  @ApiOperation({ summary: 'Restore a soft-deleted event' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the event' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event successfully restored.',
    type: EventResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to restore this event.',
  })
  async restore(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<EventResponseDto> {
    // The service method `restore` now handles the organization check.
    return this.eventService.restore(id, userId, organizationId);
  }

  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Typically only admins can hard delete
  @ApiOperation({ summary: 'Permanently delete an event (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event successfully permanently deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found.' })
  async hardDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.eventService.hardDelete(id);
  }
}
