import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketTypeService } from 'src/ticket-type/ticket-type.service';
import { Types, FilterQuery } from 'mongoose';
import { EventService } from 'src/event/event.service';
import { PurchaseService } from 'src/purchase/purchase.service';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { FindAllTicketsQueryDto } from './dto/find-all-ticket-query.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TicketDocument, TicketStatus } from './entities/ticket.entity';
import { TicketRepository } from './ticket.repository';
// Utility to generate unique codes (e.g., for ticketCode)
import { nanoid } from 'nanoid';
// Utility for QR code generation (example, you might use a dedicated library or service)
import * as QRCode from 'qrcode';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class TicketService {
 private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly eventService: EventService,
    private readonly ticketTypeService: TicketTypeService,
    private readonly userService: UsersService,
    private readonly purchaseService: PurchaseService, // Used for validation and linking
  ) {}

  /**
   * Maps a TicketDocument to a public-facing TicketResponseDto.
   * @param ticket The ticket document from the database.
   * @returns The mapped DTO.
   */
  private mapToResponseDto(ticket: TicketDocument): TicketResponseDto {
    if (!ticket) {
      return null;
    }
    return {
      id: ticket._id.toString(),
      ticketTypeId: ticket.ticketTypeId.toString(),
      eventId: ticket.eventId.toString(),
      organizationId: ticket.organizationId.toString(),
      purchaseId: ticket.purchaseId.toString(),
      ownerId: ticket.ownerId.toString(),
      status: ticket.status,
      ticketCode: ticket.ticketCode,
      qrCode: ticket.qrCode,
      priceAtPurchase: ticket.priceAtPurchase,
      currencyAtPurchase: ticket.currencyAtPurchase,
      scannedAt: ticket.scannedAt,
      scannedBy: ticket.scannedBy?.toString(),
      checkInLocation: ticket.checkInLocation,
      redemptionAttempts: ticket.redemptionAttempts,
      isTransferable: ticket.isTransferable,
      transferredTo: ticket.transferredTo?.toString(),
      transferHistory: ticket.transferHistory.map((h) => ({
        from: h.from.toString(),
        to: h.to.toString(),
        date: h.date,
      })),
      metadata: ticket.metadata,
      isDeleted: ticket.isDeleted,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      updatedBy: ticket.updatedBy,
    };
  }

   /**
   * Generates a unique ticket code.
   * You might want to make this more complex (e.g., prefix with event ID, use a specific format).
   */
  private async generateUniqueTicketCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    do {
      code = nanoid(10).toUpperCase(); // e.g., "ABC123XYZ"
      const existingTicket = await this.ticketRepository.findByTicketCode(code);
      if (!existingTicket) {
        isUnique = true;
      }
    } while (!isUnique);
    return code;
  }

  /**
   * Generates a QR code URL/path for a given ticket code.
   * In a real application, this might involve storing the QR code image
   * in cloud storage (e.g., S3) and returning its URL.
   * For simplicity, this example returns a data URL.
   */
  private async generateQrCode(ticketCode: string): Promise<string> {
    try {
      // For production, consider storing this in a CDN/cloud storage
      // and returning the public URL.
      return await QRCode.toDataURL(ticketCode);
    } catch (err) {
      this.logger.error(`Failed to generate QR code for ${ticketCode}: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to generate QR code.');
    }
  }

  /**
   * Creates a new ticket. This method is typically called internally by the PurchaseService
   * after a successful purchase, not directly by a controller endpoint.
   * It generates a unique ticket code and QR code.
   * @param createTicketDto DTO containing ticket details.
   * @returns The created ticket record.
   * @throws BadRequestException for invalid data.
   * @throws NotFoundException if related entities (event, ticket type, purchase, owner) are not found.
   */
  async create(createTicketDto: CreateTicketDto): Promise<TicketResponseDto> {
    this.logger.log(`Attempting to create a ticket for purchase ${createTicketDto.purchaseId}`);

    // 1. Validate existence of related entities
    const [event, ticketType, purchase, owner] = await Promise.all([
      this.eventService.findOnePublic(createTicketDto.eventId),
      this.ticketTypeService.findOne(createTicketDto.ticketTypeId),
      this.purchaseService.findOne(createTicketDto.purchaseId), // Assuming findOne in PurchaseService
      this.userService.findOne(createTicketDto.ownerId), // Assuming findOne in UserService
    ]);

    if (!event) throw new NotFoundException(`Event with ID "${createTicketDto.eventId}" not found.`);
    if (!ticketType) throw new NotFoundException(`TicketType with ID "${createTicketDto.ticketTypeId}" not found.`);
    if (!purchase) throw new NotFoundException(`Purchase with ID "${createTicketDto.purchaseId}" not found.`);
    if (!owner) throw new NotFoundException(`Owner with ID "${createTicketDto.ownerId}" not found.`);

    // Ensure consistency (e.g., ticketType belongs to event, purchase belongs to event)
    if (ticketType.eventId.toString() !== event.id) {
      throw new BadRequestException('Ticket type does not belong to the specified event.');
    }
    if (purchase.eventId.toString() !== event.id) {
      throw new BadRequestException('Purchase does not belong to the specified event.');
    }
    if (ticketType.organizationId.toString() !== event.organizationId.toString()) {
      throw new BadRequestException('Ticket type organization does not match event organization.');
    }
    if (purchase.organizationId.toString() !== event.organizationId.toString()) {
      throw new BadRequestException('Purchase organization does not match event organization.');
    }

    // 2. Generate unique ticket code and QR code
    const ticketCode = await this.generateUniqueTicketCode();
    const qrCode = await this.generateQrCode(ticketCode);

    // 3. Create the ticket document
    const newTicket = await this.ticketRepository.create({
      ticketTypeId: new Types.ObjectId(createTicketDto.ticketTypeId),
      eventId: new Types.ObjectId(createTicketDto.eventId),
      organizationId: new Types.ObjectId(createTicketDto.organizationId),
      purchaseId: new Types.ObjectId(createTicketDto.purchaseId),
      ownerId: new Types.ObjectId(createTicketDto.ownerId),
      status: TicketStatus.VALID, // New tickets are always valid initially
      ticketCode: ticketCode,
      qrCode: qrCode,
      priceAtPurchase: createTicketDto.priceAtPurchase,
      currencyAtPurchase: createTicketDto.currencyAtPurchase,
      isTransferable: createTicketDto.isTransferable,
      metadata: createTicketDto.metadata,
      // Default values for other fields are handled by the schema
    });

    this.logger.log(`Ticket ${newTicket._id} created for purchase ${newTicket.purchaseId}.`);
    return this.mapToResponseDto(newTicket);
  }

  /**
   * Finds all tickets with pagination and filtering.
   * @param queryDto DTO for pagination and filtering options.
   * @param authenticatedUserId Optional: The ID of the authenticated user (for customer-specific queries).
   * @param authenticatedOrganizationId Optional: The organization ID of the authenticated user (for agent-specific queries).
   * @returns A paginated list of tickets.
   */
  async findAll(
    queryDto: FindAllTicketsQueryDto,
    authenticatedUserId?: string, // For customers to see only their own tickets
    authenticatedOrganizationId?: string, // For agents to see only their org's tickets
  ): Promise<PaginatedResponseDto<TicketResponseDto>> {
    this.logger.log(`Fetching all tickets with query: ${JSON.stringify(queryDto)}`);

    const {
      page,
      limit,
      ticketTypeId,
      eventId,
      organizationId,
      purchaseId,
      ownerId,
      status,
      ticketCode,
      includeDeleted,
      sortBy,
      sortDirection,
      createdAtGte,
      createdAtLte,
    } = queryDto;

    const filter: FilterQuery<TicketDocument> = {};

    // Enforce owner ownership if authenticatedUserId is provided (for customers)
    if (authenticatedUserId) {
      filter.ownerId = new Types.ObjectId(authenticatedUserId);
    } else if (ownerId) {
      // Allow filtering by ownerId for admins/agents
      filter.ownerId = new Types.ObjectId(ownerId);
    }

    // Enforce organization ownership if authenticatedOrganizationId is provided (for agents)
    if (authenticatedOrganizationId) {
      filter.organizationId = new Types.ObjectId(authenticatedOrganizationId);
    } else if (organizationId) {
      // Allow filtering by organizationId for admins
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    if (ticketTypeId) filter.ticketTypeId = new Types.ObjectId(ticketTypeId);
    if (eventId) filter.eventId = new Types.ObjectId(eventId);
    if (purchaseId) filter.purchaseId = new Types.ObjectId(purchaseId);
    if (status) filter.status = status;
    if (ticketCode) filter.ticketCode = ticketCode;
    if (!includeDeleted) filter.isDeleted = false;

    if (createdAtGte) filter.createdAt = { $gte: createdAtGte };
    if (createdAtLte) filter.createdAt = { ...filter.createdAt, $lte: createdAtLte };

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    const paginatedResult = await this.ticketRepository.findWithPagination(
      filter,
      page,
      limit,
      sort,
    );

    return new PaginatedResponseDto({
      data: paginatedResult.data.map(this.mapToResponseDto),
      total: paginatedResult.total,
      currentPage: paginatedResult.page,
      totalPages: paginatedResult.pages,
    });
  }

  /**
   * Finds a single ticket by its ID.
   * @param id The ID of the ticket.
   * @param authenticatedUserId Optional: The ID of the authenticated user (for customer-specific access).
   * @param authenticatedOrganizationId Optional: The organization ID of the authenticated user (for agent-specific access).
   * @param includeDeleted Whether to include soft-deleted tickets.
   * @returns The found ticket.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the ticket is not found.
   * @throws ForbiddenException if the user is not authorized to access this ticket.
   */
  async findOne(
    id: string,
    authenticatedUserId?: string,
    authenticatedOrganizationId?: string,
    includeDeleted: boolean = false,
  ): Promise<TicketResponseDto> {
    this.logger.log(`Fetching ticket with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID format.');
    }

    const filter: FilterQuery<TicketDocument> = { _id: id };
    if (!includeDeleted) filter.isDeleted = false;

    const ticket = await this.ticketRepository.findOne(filter);

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found.`);
    }

    // Authorization Check:
    // 1. If authenticatedUserId is provided (customer), ensure they are the owner.
    if (authenticatedUserId && ticket.ownerId.toString() !== authenticatedUserId) {
      throw new ForbiddenException('You do not have permission to access this ticket.');
    }
    // 2. If authenticatedOrganizationId is provided (agent), ensure ticket belongs to their organization.
    if (authenticatedOrganizationId && ticket.organizationId.toString() !== authenticatedOrganizationId) {
      throw new ForbiddenException('You do not have permission to access this ticket.');
    }

    return this.mapToResponseDto(ticket);
  }

  /**
   * Finds a single ticket by its unique ticket code.
   * This is primarily used for check-in/validation.
   * @param ticketCode The unique code of the ticket.
   * @param authenticatedOrganizationId Optional: The organization ID of the authenticated user (for agent-specific access).
   * @returns The found ticket.
   * @throws NotFoundException if the ticket is not found.
   * @throws ForbiddenException if the user is not authorized to access this ticket.
   */
  async findByTicketCode(
    ticketCode: string,
    authenticatedOrganizationId?: string,
  ): Promise<TicketResponseDto> {
    this.logger.log(`Fetching ticket with code: ${ticketCode}`);

    const ticket = await this.ticketRepository.findByTicketCode(ticketCode);

    if (!ticket) {
      throw new NotFoundException(`Ticket with code "${ticketCode}" not found.`);
    }

    // Authorization Check:
    // If authenticatedOrganizationId is provided (agent), ensure ticket belongs to their organization.
    if (authenticatedOrganizationId && ticket.organizationId.toString() !== authenticatedOrganizationId) {
      throw new ForbiddenException('You do not have permission to access this ticket.');
    }

    return this.mapToResponseDto(ticket);
  }

  /**
   * Updates the status of a ticket.
   * This method can be used for manual status changes (e.g., cancelling a ticket).
   * For 'USED' status, `recordScan` should be preferred.
   * @param id The ID of the ticket to update.
   * @param newStatus The new status for the ticket.
   * @param updatedBy The ID of the user performing the update.
   * @returns The updated ticket record.
   * @throws BadRequestException for invalid status transitions.
   * @throws NotFoundException if the ticket is not found.
   */
  async updateTicketStatus(
    id: string,
    newStatus: TicketStatus,
    updatedBy: string,
  ): Promise<TicketResponseDto> {
    this.logger.log(`Updating status for ticket ${id} to ${newStatus}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID format.');
    }

    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found.`);
    }

    // Prevent invalid status transitions (example logic)
    if (
      (ticket.status === TicketStatus.USED && newStatus !== TicketStatus.REFUNDED) ||
      (ticket.status === TicketStatus.CANCELLED && newStatus !== TicketStatus.REFUNDED) ||
      (ticket.status === TicketStatus.REFUNDED && newStatus !== TicketStatus.REFUNDED) // Cannot change from refunded
    ) {
      throw new BadRequestException(`Invalid status transition from ${ticket.status} to ${newStatus}.`);
    }

    const updatedTicket = await this.ticketRepository.updateStatus(id, newStatus, updatedBy);

    if (!updatedTicket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found after status update attempt.`);
    }
    this.logger.log(`Ticket ${id} status updated to ${newStatus}.`);
    return this.mapToResponseDto(updatedTicket);
  }

  /**
   * Records a ticket scan, marking it as 'USED'.
   * This is the primary method for event check-in.
   * @param ticketCode The unique code of the ticket to scan.
   * @param scannedByUserId The ID of the user (staff) performing the scan.
   * @param checkInLocation Optional location of the scan (e.g., "Gate A").
   * @returns The updated ticket record.
   * @throws NotFoundException if the ticket is not found.
   * @throws BadRequestException if the ticket is already used, cancelled, or expired.
   */
  async recordScan(
    ticketCode: string,
    scannedByUserId: string,
    checkInLocation?: string,
  ): Promise<TicketResponseDto> {
    this.logger.log(`Attempting to scan ticket with code: ${ticketCode}`);

    const ticket = await this.ticketRepository.findByTicketCode(ticketCode);
    if (!ticket) {
      throw new NotFoundException(`Ticket with code "${ticketCode}" not found.`);
    }

    // Validate scanner user
    const scannedBy = await this.userService.findOne(scannedByUserId);
    if (!scannedBy) {
      throw new NotFoundException(`Scanner user with ID "${scannedByUserId}" not found.`);
    }
    // Ensure scanner belongs to the organization of the event
    if (scannedBy.organizationId.toString() !== ticket.organizationId.toString()) {
      throw new ForbiddenException('You do not have permission to scan tickets for this organization.');
    }

    // Check ticket status for validity
    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException(`Ticket with code "${ticketCode}" has already been used.`);
    }
    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException(`Ticket with code "${ticketCode}" has been cancelled.`);
    }
    if (ticket.status === TicketStatus.REFUNDED) {
      throw new BadRequestException(`Ticket with code "${ticketCode}" has been refunded.`);
    }
    if (ticket.status === TicketStatus.EXPIRED) {
      throw new BadRequestException(`Ticket with code "${ticketCode}" has expired.`);
    }

    // Record the scan
    const updatedTicket = await this.ticketRepository.recordScan(
      ticket.id,
      scannedByUserId,
      checkInLocation,
    );

    if (!updatedTicket) {
      throw new InternalServerErrorException(`Failed to record scan for ticket ${ticketCode}.`);
    }

    this.logger.log(`Ticket ${ticketCode} successfully scanned by ${scannedByUserId}.`);
    return this.mapToResponseDto(updatedTicket);
  }

  /**
   * Transfers ownership of a ticket from one user to another.
   * @param ticketId The ID of the ticket to transfer.
   * @param currentOwnerId The ID of the current owner (for authorization).
   * @param newOwnerId The ID of the new owner.
   * @returns The updated ticket record.
   * @throws NotFoundException if ticket or users are not found.
   * @throws BadRequestException if ticket is not transferable or current owner is incorrect.
   * @throws ConflictException if new owner is the same as current owner.
   */
  async transferTicket(
    ticketId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<TicketResponseDto> {
    this.logger.log(`Attempting to transfer ticket ${ticketId} from ${currentOwnerId} to ${newOwnerId}`);
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new BadRequestException('Invalid ticket ID format.');
    }
    if (!Types.ObjectId.isValid(currentOwnerId)) {
      throw new BadRequestException('Invalid current owner ID format.');
    }
    if (!Types.ObjectId.isValid(newOwnerId)) {
      throw new BadRequestException('Invalid new owner ID format.');
    }

    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${ticketId}" not found.`);
    }

    if (ticket.ownerId.toString() !== currentOwnerId) {
      throw new ForbiddenException('You are not the current owner of this ticket.');
    }
    if (ticket.ownerId.toString() === newOwnerId) {
      throw new ConflictException('New owner cannot be the same as the current owner.');
    }
    if (!ticket.isTransferable) {
      throw new BadRequestException('This ticket is not transferable.');
    }
    if (ticket.status !== TicketStatus.VALID) {
      throw new BadRequestException(`Ticket cannot be transferred in "${ticket.status}" status.`);
    }

    const newOwner = await this.userService.findOne(newOwnerId);
    if (!newOwner) {
      throw new NotFoundException(`New owner with ID "${newOwnerId}" not found.`);
    }

    const updatedTicket = await this.ticketRepository.transferOwner(
      ticketId,
      currentOwnerId,
      newOwnerId,
    );

    if (!updatedTicket) {
      throw new InternalServerErrorException(`Failed to transfer ticket ${ticketId}.`);
    }

    this.logger.log(`Ticket ${ticketId} successfully transferred to ${newOwnerId}.`);
    return this.mapToResponseDto(updatedTicket);
  }

  /**
   * Invalidates a batch of tickets associated with a specific purchase.
   * This method is typically called by the PurchaseService when a purchase is cancelled or refunded.
   * @param purchaseId The ID of the purchase whose tickets should be invalidated.
   * @param newStatus The status to set the tickets to (e.g., CANCELLED or REFUNDED).
   * @param updatedBy The ID of the user performing the action.
   * @returns A message indicating success.
   * @throws BadRequestException if the purchase ID format is invalid.
   */
  async invalidateTicketsByPurchaseId(
    purchaseId: string,
    newStatus: TicketStatus.CANCELLED | TicketStatus.REFUNDED,
    updatedBy: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Invalidating tickets for purchase ${purchaseId} with status ${newStatus}.`);
    if (!Types.ObjectId.isValid(purchaseId)) {
      throw new BadRequestException('Invalid purchase ID format.');
    }

    const result = await this.ticketRepository.invalidateByPurchaseId(
      purchaseId,
      newStatus,
      updatedBy,
    );

    this.logger.log(`${result.modifiedCount} tickets invalidated for purchase ${purchaseId}.`);
    return { message: `${result.modifiedCount} tickets successfully invalidated.` };
  }

  /**
   * Soft-deletes a ticket record.
   * This should typically be restricted to admins or specific scenarios.
   * @param id The ID of the ticket to soft-delete.
   * @param userId The ID of the user performing the action.
   * @returns A success message.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the ticket is not found or already soft-deleted.
   */
  async softDelete(id: string, userId: string): Promise<{ message: string }> {
    this.logger.log(`User ${userId} attempting to soft-delete ticket ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID format.');
    }

    const existingTicket = await this.ticketRepository.findById(id);
    if (!existingTicket || existingTicket.isDeleted) {
      throw new NotFoundException(`Ticket with ID "${id}" not found or already deleted.`);
    }

    await this.ticketRepository.softDelete(id, userId);
    this.logger.log(`Successfully soft-deleted ticket with ID: ${id}`);
    return { message: `Ticket with ID "${id}" has been successfully deleted.` };
  }


  /**
   * Permanently deletes a ticket record. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   * @param id The ID of the ticket to permanently delete.
   * @returns A success message.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the ticket is not found.
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to permanently delete ticket with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID format.');
    }

    const deletedTicket = await this.ticketRepository.delete(id);

    if (!deletedTicket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found for permanent deletion.`);
    }
    this.logger.log(`Successfully permanently deleted ticket with ID: ${id}`);
    return { message: `Ticket with ID "${id}" has been permanently deleted.` };
  }

}
