// ticket.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, Logger, Query, UseGuards } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator'; // Corrected import path for Roles decorator
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/schema/user.schema';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { FindAllTicketsQueryDto } from './dto/find-all-ticket-query.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TicketStatus } from './entities/ticket.entity';
import { GetOrganizationId } from '../auth/decorators/get-organization-id.decorator'; // Import the new decorator

@Controller('tickets') // Changed to plural for RESTful consistency
@ApiBearerAuth() // Indicates that JWT authentication is required for all endpoints in this controller
@UseGuards(JwtAuthGuard)
export class TicketController {
    private readonly logger = new Logger(TicketController.name);

  constructor(private readonly ticketService: TicketService) {}

  // The `create` method from TicketService is typically called internally by the PurchaseService
  // after a successful purchase, not directly exposed as a public API endpoint.
  // Therefore, there is no `@Post()` endpoint for `createTicketDto` here.

  /**
   * Retrieves all tickets with pagination and filtering.
   * - Customers can only see their own tickets.
   * - Agents can see all tickets for their organization.
   * - Admins can see all tickets across all organizations.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all tickets with pagination and filtering' })
  @ApiQuery({ type: FindAllTicketsQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tickets.',
    type: PaginatedResponseDto<TicketResponseDto>,
  })
  async findAll(
    @Query() query: FindAllTicketsQueryDto,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[],
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<PaginatedResponseDto<TicketResponseDto>> {
    let authUserId: string | undefined;
    let authOrgId: string | undefined;

    if (userRoles.includes(UserRole.CUSTOMER)) {
      authUserId = userId; // Customer can only see tickets they own
    } else if (userRoles.includes(UserRole.AGENT)) {
      authOrgId = organizationId; // Agent can see all tickets for their organization
    }
    // Admin will have both undefined, allowing them to query everything

    return this.ticketService.findAll(query, authUserId, authOrgId);
  }

  /**
   * Retrieves a single ticket by its ID.
   * - Customers can only retrieve their own tickets.
   * - Agents can only retrieve tickets for their organization.
   * - Admins can retrieve any ticket.
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a ticket by ID' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket details.',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to access this ticket.',
  })
  async findOne(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[],
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<TicketResponseDto> {
    let authUserId: string | undefined;
    let authOrgId: string | undefined;

    if (userRoles.includes(UserRole.CUSTOMER)) {
      authUserId = userId;
    } else if (userRoles.includes(UserRole.AGENT)) {
      authOrgId = organizationId;
    }
    // Admin will have both undefined

    return this.ticketService.findOne(id, authUserId, authOrgId);
  }

  /**
   * Retrieves a single ticket by its unique ticket code.
   * This endpoint is primarily used by event staff for check-in/validation.
   * - Agents can retrieve tickets for their organization.
   * - Admins can retrieve any ticket.
   */
  @Get('code/:ticketCode')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a ticket by its unique ticket code' })
  @ApiParam({
    name: 'ticketCode',
    required: true,
    description: 'Unique code of the ticket',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket details.',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to access this ticket.',
  })
  async findByTicketCode(
    @Param('ticketCode') ticketCode: string,
    @GetOrganizationId() organizationId: string, // Use the new decorator
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<TicketResponseDto> {
    let authOrgId: string | undefined;
    if (userRoles.includes(UserRole.AGENT)) {
      authOrgId = organizationId;
    }
    // Admin will have authOrgId undefined

    return this.ticketService.findByTicketCode(ticketCode, authOrgId);
  }

  /**
   * Updates the status of a ticket.
   * This endpoint is typically for administrative or specific system use (e.g., cancelling a ticket manually).
   * For 'USED' status, the `recordScan` endpoint should be used.
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Restrict this to Admins for manual status changes
  @ApiOperation({ summary: 'Update the status of a ticket (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(TicketStatus) },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket status successfully updated.',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition or invalid input.',
  })
  async updateTicketStatus(
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
    @GetUser('_id') userId: string, // User performing the update
  ): Promise<TicketResponseDto> {
    return this.ticketService.updateTicketStatus(id, status, userId);
  }

  /**
   * Records a ticket scan, marking it as 'USED'.
   * This is the primary endpoint for event check-in.
   * Only agents or admins can perform scans.
   */
  @Post('scan')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record a ticket scan (check-in)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ticketCode: { type: 'string', description: 'The unique code of the ticket to scan.' },
        checkInLocation: {
          type: 'string',
          description: 'Optional: Specific location where the ticket was checked in (e.g., "Gate A").',
        },
      },
      required: ['ticketCode'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket successfully scanned and marked as used.',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ticket already used, cancelled, expired, or invalid.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not authorized to scan tickets for this organization.',
  })
  async recordScan(
    @Body('ticketCode') ticketCode: string,
    @Body('checkInLocation') checkInLocation: string,
    @GetUser('_id') scannedByUserId: string, // The ID of the staff member scanning
  ): Promise<TicketResponseDto> {
    return this.ticketService.recordScan(ticketCode, scannedByUserId, checkInLocation);
  }

   /**
   * Transfers ownership of a ticket from the current owner to a new owner.
   * - Only the current owner or an admin can initiate a transfer.
   * - The ticket must be transferable and in a VALID status.
   */
  @Post(':id/transfer')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN) // Customers can transfer their own tickets, Admins can transfer any
  @ApiOperation({ summary: 'Transfer ownership of a ticket' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket to transfer' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newOwnerId: { type: 'string', description: 'The ID of the user who will become the new owner.' },
      },
      required: ['newOwnerId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket ownership successfully transferred.',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket or new owner not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ticket not transferable, invalid status, or new owner is same as current.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. You are not the current owner of this ticket.',
  })
  async transferTicket(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
    @GetUser('_id') currentOwnerId: string, // The authenticated user is the current owner
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<TicketResponseDto> {
    // If the user is an admin, they can transfer any ticket.
    // Otherwise, the authenticated user must be the current owner.
    const actualCurrentOwnerId = userRoles.includes(UserRole.ADMIN) ? undefined : currentOwnerId;

    return this.ticketService.transferTicket(id, actualCurrentOwnerId || currentOwnerId, newOwnerId);
  }

  /**
   * Soft deletes a ticket record.
   * This is an administrative action.
   */
  @Delete(':id/soft')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete a ticket record (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket successfully soft-deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found.' })
  async softDelete(
    @Param('id') id: string,
    @GetUser('_id') userId: string, // User performing the soft delete
  ): Promise<{ message: string }> {
    return this.ticketService.softDelete(id, userId);
  }

  /**
   * Permanently deletes a ticket record. Use with extreme caution.
   * This is an administrative action.
   */
  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete a ticket record (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the ticket' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket successfully permanently deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found.' })
  async hardDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.ticketService.hardDelete(id);
  }
}
