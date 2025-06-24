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
} from '@nestjs/common';
import { TicketTypeService } from './ticket-type.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/auth/schema/user.schema';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { TicketTypeResponseDto } from './dto/ticket-type-response.dto';
import { FindAllTicketTypesQueryDto } from './dto/find-all-ticket-types-query.dto';

@Controller('ticket-types') // Changed to plural for RESTful consistency
@ApiBearerAuth() // Indicates that JWT authentication is required for all endpoints in this controller
@UseGuards(JwtAuthGuard) // Apply JwtAuthGuard to all endpoints by default
export class TicketTypeController {
  private readonly logger = new Logger(TicketTypeController.name);

  constructor(private readonly ticketTypeService: TicketTypeService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Only agents and admins can create ticket types
  @ApiOperation({ summary: 'Create a new ticket type for an event' })
  @ApiBody({ type: CreateTicketTypeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket type successfully created.',
    type: TicketTypeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or validation error.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event or Organization not found.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not authorized to create ticket types for this event/organization.',
  })
  async create(
    @Body() createTicketTypeDto: CreateTicketTypeDto,
    @GetUser('_id') userId: string, // The ID of the authenticated user
    @GetUser('organizationId') organizationId: string, // The organization ID of the authenticated user
  ): Promise<TicketTypeResponseDto> {
    // The service will handle validation and authorization based on organizationId
    return this.ticketTypeService.create(
      createTicketTypeDto,
      userId,
      organizationId,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Agents can see their org's ticket types, Admins can see all
  @ApiOperation({ summary: 'Get all ticket types with pagination and filtering' })
  @ApiQuery({ type: FindAllTicketTypesQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of ticket types.',
    type: PaginatedResponseDto<TicketTypeResponseDto>,
  })
  async findAll(
    @Query() query: FindAllTicketTypesQueryDto,
    @GetUser('roles') userRoles: UserRole[],
    @GetUser('organizationId') organizationId: string, // The organization ID of the authenticated user
  ): Promise<PaginatedResponseDto<TicketTypeResponseDto>> {
    // Admins can query all, agents are restricted to their organization
    const authOrgId = userRoles.includes(UserRole.ADMIN) ? undefined : organizationId;
    return this.ticketTypeService.findAll(query, authOrgId);
  }

  @Get('public')
  @UseGuards(RolesGuard) // Still use RolesGuard for public access, but perhaps with a specific public role or no role requirement
  @Roles(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN) // Allow customers to view public ticket types
  @ApiOperation({ summary: 'Get all public ticket types available for sale' })
  @ApiQuery({ type: FindAllTicketTypesQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of public ticket types available for sale.',
    type: PaginatedResponseDto<TicketTypeResponseDto>,
  })
  async findAllPublic(
    @Query() query: FindAllTicketTypesQueryDto,
  ): Promise<PaginatedResponseDto<TicketTypeResponseDto>> {
    // For public view, ensure only active, non-hidden, non-deleted tickets are shown
    query.isActive = true;
    query.isHidden = false;
    query.includeDeleted = false;
    // The service's findAvailableForSale method (or a similar public method) would be better here
    // For now, we'll use findAll and rely on the service's internal logic
    return this.ticketTypeService.findAll(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Agents can get their org's ticket types, Admins can get any
  @ApiOperation({ summary: 'Get a ticket type by ID' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket type' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Whether to include soft-deleted records',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket type details.',
    type: TicketTypeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket type not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to access this ticket type.',
  })
  async findOne(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted: boolean = false,
    @GetUser('roles') userRoles: UserRole[],
    @GetUser('organizationId') organizationId: string, // The organization ID of the authenticated user
  ): Promise<TicketTypeResponseDto> {
    // Admins can fetch any, agents are restricted to their organization
    const authOrgId = userRoles.includes(UserRole.ADMIN) ? undefined : organizationId;
    return this.ticketTypeService.findOne(id, authOrgId, includeDeleted);
  }

  @Get('public/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN) // Allow customers to view public ticket types
  @ApiOperation({ summary: 'Get a single public ticket type by ID' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public ticket type details.',
    type: TicketTypeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Public ticket type not found.' })
  async findOnePublic(@Param('id') id: string): Promise<TicketTypeResponseDto> {
    // For public view, ensure only active, non-hidden, non-deleted tickets are shown
    // The service's findOne method will handle the filtering based on the query.
    // We'll call findOne with no organizationId and rely on the service to filter for public/available.
    return this.ticketTypeService.findOne(id, undefined, false); // No orgId, no deleted
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Only agents and admins can update ticket types
  @ApiOperation({ summary: 'Update a ticket type' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket type' })
  @ApiBody({ type: UpdateTicketTypeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket type successfully updated.',
    type: TicketTypeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket type not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to update this ticket type.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or validation error.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTicketTypeDto: UpdateTicketTypeDto,
    @GetUser('_id') userId: string,
    @GetUser('organizationId') organizationId: string,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypeService.update(
      id,
      updateTicketTypeDto,
      userId,
      organizationId,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Only agents and admins can soft delete ticket types
  @ApiOperation({ summary: 'Soft delete a ticket type' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket type successfully soft-deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket type not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to delete this ticket type.',
  })
  async softDelete(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetUser('organizationId') organizationId: string,
  ): Promise<{ message: string }> {
    return this.ticketTypeService.softDelete(id, userId, organizationId);
  }

  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Only agents and admins can restore ticket types
  @ApiOperation({ summary: 'Restore a soft-deleted ticket type' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket type successfully restored.',
    type: TicketTypeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket type not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to restore this ticket type.',
  })
  async restore(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetUser('organizationId') organizationId: string,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypeService.restore(id, userId, organizationId);
  }

  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Only admins can hard delete ticket types
  @ApiOperation({ summary: 'Permanently delete a ticket type (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket type successfully permanently deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket type not found.' })
  async hardDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.ticketTypeService.hardDelete(id);
  }

  // Endpoints for atomic quantity management (typically used internally or by a dedicated purchase service)
  @Patch(':id/sell/:quantity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Or a more specific role like 'SALES_AGENT'
  @ApiOperation({ summary: 'Increment quantity sold for a ticket type (sell tickets)' })
  @ApiParam({ name: 'id', description: 'ID of the ticket type' })
  @ApiParam({ name: 'quantity', description: 'Number of tickets to sell' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tickets sold successfully.', type: TicketTypeResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket type not found.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Not enough tickets available.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid quantity or ticket not available for sale.' })
  async incrementQuantitySold(
    @Param('id') id: string,
    @Param('quantity') quantity: number,
  ): Promise<TicketTypeResponseDto> {
    // Note: Authorization for this endpoint (e.g., ensuring it's for an event owned by the agent's org)
    // would typically happen in the service or a higher-level purchase flow.
    return this.ticketTypeService.incrementQuantitySold(id, Number(quantity));
  }

  @Patch(':id/return/:quantity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Or a more specific role like 'REFUND_AGENT'
  @ApiOperation({ summary: 'Decrement quantity sold for a ticket type (return/refund tickets)' })
  @ApiParam({ name: 'id', description: 'ID of the ticket type' })
  @ApiParam({ name: 'quantity', description: 'Number of tickets to return' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tickets returned successfully.', type: TicketTypeResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket type not found.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Not enough tickets sold to return.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid quantity or ticket not available for return.' })
  async decrementQuantitySold(
    @Param('id') id: string,
    @Param('quantity') quantity: number,
  ): Promise<TicketTypeResponseDto> {
    // Note: Authorization for this endpoint (e.g., ensuring it's for an event owned by the agent's org)
    // would typically happen in the service or a higher-level refund flow.
    return this.ticketTypeService.decrementQuantitySold(id, Number(quantity));
  }
}
