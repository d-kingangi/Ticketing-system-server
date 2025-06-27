import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { FilterQuery, Types } from 'mongoose';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { TicketTypeRepository } from './ticket-type.repository';
import {
  TicketTypeDocument,
} from './entities/ticket-type.entity';
import { TicketTypeResponseDto } from './dto/ticket-type-response.dto';
import { FindAllTicketTypesQueryDto } from './dto/find-all-ticket-types-query.dto';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { EventService } from '../event/event.service'; // Assuming EventService is available
import { OrganizationService } from '../organization/organization.service'; // Assuming OrganizationService is available

@Injectable()
export class TicketTypeService {
  private readonly logger = new Logger(TicketTypeService.name);

  constructor(
    private readonly ticketTypeRepository: TicketTypeRepository,
    private readonly eventService: EventService, // Inject EventService for event validation
    private readonly organizationService: OrganizationService, // Inject OrganizationService for user-org validation
  ) {}

  /**
   * Maps a TicketTypeDocument to a public-facing TicketTypeResponseDto.
   * @param ticketType The ticket type document from the database.
   * @returns The mapped DTO.
   */
  private mapToResponseDto(ticketType: TicketTypeDocument): TicketTypeResponseDto {
    if (!ticketType) {
      return null;
    }
    return {
      id: ticketType._id.toString(),
      eventId: ticketType.eventId.toString(),
      organizationId: ticketType.organizationId.toString(),
      name: ticketType.name,
      description: ticketType.description,
      price: ticketType.price,
      currency: ticketType.currency,
      quantity: ticketType.quantity,
      quantitySold: ticketType.quantitySold,
      salesStartDate: ticketType.salesStartDate,
      salesEndDate: ticketType.salesEndDate,
      isActive: ticketType.isActive,
      isRefundable: ticketType.isRefundable,
      minPurchaseQuantity: ticketType.minPurchaseQuantity,
      maxPurchaseQuantity: ticketType.maxPurchaseQuantity,
      displayOrder: ticketType.displayOrder,
      isHidden: ticketType.isHidden,
      availableUntil: ticketType.availableUntil,
      purchaseLimitPerUser: ticketType.purchaseLimitPerUser,
      isDeleted: ticketType.isDeleted,
      createdAt: ticketType.createdAt,
      updatedAt: ticketType.updatedAt,
      updatedBy: ticketType.updatedBy,
    };
  }

  /**
   * Creates a new ticket type for a specific event and organization.
   * @param createTicketTypeDto DTO for creating the ticket type.
   * @param userId The ID of the user creating the ticket type.
   * @param authenticatedOrganizationId The organization ID of the authenticated user.
   * @returns The newly created ticket type.
   * @throws NotFoundException if the event or organization is not found.
   * @throws ForbiddenException if the user is not authorized to create ticket types for this event/organization.
   * @throws BadRequestException for invalid sales dates.
   */
  async create(
    createTicketTypeDto: CreateTicketTypeDto,
    userId: string,
    authenticatedOrganizationId: string,
  ): Promise<TicketTypeResponseDto> {
    this.logger.log(`User ${userId} attempting to create ticket type "${createTicketTypeDto.name}" for event ${createTicketTypeDto.eventId}`);

    // 1. Verify the user is authorized for the organization associated with the event.
    await this.organizationService.verifyUserInOrganization(userId, authenticatedOrganizationId);
    const event = await this.eventService.findOne(createTicketTypeDto.eventId, authenticatedOrganizationId);
    if (!event) {
        throw new NotFoundException(`Event with ID "${createTicketTypeDto.eventId}" not found for your organization.`);
    }

    // 2. Validate sales dates.
    if (createTicketTypeDto.salesStartDate >= createTicketTypeDto.salesEndDate) {
      throw new BadRequestException('Sales start date must be before sales end date.');
    }
    if (createTicketTypeDto.availableUntil && createTicketTypeDto.availableUntil > createTicketTypeDto.salesEndDate) {
      throw new BadRequestException('Available until date cannot be after sales end date.');
    }


    const ticketTypeData = {
      ...createTicketTypeDto,
      organizationId: new Types.ObjectId(authenticatedOrganizationId),
      eventId: new Types.ObjectId(createTicketTypeDto.eventId),
      updatedBy: userId,
    };

    const newTicketType = await this.ticketTypeRepository.create(ticketTypeData);
    this.logger.log(`Successfully created ticket type with ID: ${newTicketType._id}`);
    return this.mapToResponseDto(newTicketType);
  }

  /**
   * Finds all ticket types with pagination and filtering.
   * Can be filtered by eventId or organizationId.
   * @param queryDto DTO for pagination and filtering options.
   * @param authenticatedOrganizationId Optional: The organization ID of the authenticated user (for agent-specific queries).
   * @returns A paginated list of ticket types.
   */
  async findAll(
    queryDto: FindAllTicketTypesQueryDto,
    authenticatedOrganizationId?: string, // For agents to see only their org's ticket types
  ): Promise<PaginatedResponseDto<TicketTypeResponseDto>> {
    this.logger.log(`Fetching all ticket types with query: ${JSON.stringify(queryDto)}`);

    const {
      page,
      limit,
      name,
      eventId,
      currency,
      isActive,
      isHidden,
      includeDeleted,
      sortBy,
      sortDirection,
      salesStartDateGte,
      salesEndDateLte,
    } = queryDto;

    const filter: FilterQuery<TicketTypeDocument> = {};

    // Enforce organization ownership if an authenticated organization ID is provided
    if (authenticatedOrganizationId) {
      filter.organizationId = new Types.ObjectId(authenticatedOrganizationId);
    } else if (queryDto.organizationId) {
      // Allow filtering by organizationId for public/admin queries if no authenticated orgId is present
      filter.organizationId = new Types.ObjectId(queryDto.organizationId);
    }

    if (name) filter.name = { $regex: name, $options: 'i' };
    if (eventId) filter.eventId = new Types.ObjectId(eventId);
    if (currency) filter.currency = currency;
    if (isActive !== undefined) filter.isActive = isActive;
    if (isHidden !== undefined) filter.isHidden = isHidden;
    if (!includeDeleted) filter.isDeleted = false;

    if (salesStartDateGte) filter.salesStartDate = { $gte: salesStartDateGte };
    if (salesEndDateLte) filter.salesEndDate = { $lte: salesEndDateLte };

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    const paginatedResult = await this.ticketTypeRepository.findWithPagination(
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
   * Finds a single ticket type by its ID.
   * @param id The ID of the ticket type.
   * @param authenticatedOrganizationId Optional: The organization ID of the authenticated user (for agent-specific queries).
   * @param includeDeleted Whether to include soft-deleted ticket types.
   * @returns The found ticket type.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the ticket type is not found.
   * @throws ForbiddenException if the user is not authorized to access this ticket type.
   */
  async findOne(
    id: string,
    authenticatedOrganizationId?: string,
    includeDeleted: boolean = false,
  ): Promise<TicketTypeResponseDto> {
    this.logger.log(`Fetching ticket type with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket type ID format.');
    }

    const filter: FilterQuery<TicketTypeDocument> = { _id: id };
    if (!includeDeleted) filter.isDeleted = false;

    const ticketType = await this.ticketTypeRepository.findOne(filter);

    if (!ticketType) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found.`);
    }

    // Authorization Check: If an organization ID is provided, ensure ownership
    if (authenticatedOrganizationId && ticketType.organizationId.toString() !== authenticatedOrganizationId) {
      throw new ForbiddenException('You do not have permission to access this ticket type.');
    }

    return this.mapToResponseDto(ticketType);
  }

  /**
   * Updates an existing ticket type.
   * @param id The ID of the ticket type to update.
   * @param updateTicketTypeDto DTO with the update data.
   * @param userId The ID of the user performing the update.
   * @param authenticatedOrganizationId The organization ID of the authenticated user.
   * @returns The updated ticket type.
   * @throws BadRequestException for invalid ID format or sales dates.
   * @throws NotFoundException if the ticket type is not found.
   * @throws ForbiddenException if the user is not authorized to update this ticket type.
   */
  async update(
    id: string,
    updateTicketTypeDto: UpdateTicketTypeDto,
    userId: string,
    authenticatedOrganizationId: string,
  ): Promise<TicketTypeResponseDto> {
    this.logger.log(`User ${userId} attempting to update ticket type ${id}`);
    
    const existingTicketType = await this.ticketTypeRepository.findById(id);
    if (!existingTicketType || existingTicketType.isDeleted) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found.`);
    }

    if (existingTicketType.organizationId.toString() !== authenticatedOrganizationId) {
      throw new ForbiddenException('You do not have permission to update this ticket type.');
    }

    const updateData = { ...updateTicketTypeDto, updatedBy: userId };
    const updatedTicketType = await this.ticketTypeRepository.update(id, updateData);
    
    this.logger.log(`Successfully updated ticket type with ID: ${id}`);
    return this.mapToResponseDto(updatedTicketType);
  }


  /**
   * Soft-deletes a ticket type.
   * @param id The ID of the ticket type to soft-delete.
   * @param userId The ID of the user performing the action.
   * @param authenticatedOrganizationId The organization ID of the authenticated user.
   * @returns A success message.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the ticket type is not found or already soft-deleted.
   * @throws ForbiddenException if the user is not authorized to delete this ticket type.
   */
  async softDelete(
    id: string,
    userId: string,
    authenticatedOrganizationId: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `User ${userId} attempting to soft-delete ticket type ${id} from organization ${authenticatedOrganizationId}`,
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket type ID format.');
    }

    // 1. Retrieve existing ticket type
    const existingTicketType = await this.ticketTypeRepository.findById(id);
    if (!existingTicketType || existingTicketType.isDeleted) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found or already deleted.`);
    }

    // 2. Authorization Check
    if (existingTicketType.organizationId.toString() !== authenticatedOrganizationId) {
      throw new ForbiddenException('You do not have permission to delete this ticket type.');
    }

    await this.ticketTypeRepository.softDelete(id, userId);
    this.logger.log(`Successfully soft-deleted ticket type with ID: ${id}`);
    return { message: `Ticket type with ID "${id}" has been successfully deleted.` };
  }

  /**
   * Restores a soft-deleted ticket type.
   * @param id The ID of the ticket type to restore.
   * @param userId The ID of the user performing the action.
   * @param authenticatedOrganizationId The organization ID of the authenticated user.
   * @returns The restored ticket type.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the ticket type is not found or not in a soft-deleted state.
   * @throws ForbiddenException if the user is not authorized to restore this ticket type.
   */
  async restore(
    id: string,
    userId: string,
    authenticatedOrganizationId: string,
  ): Promise<TicketTypeResponseDto> {
    this.logger.log(
      `User ${userId} attempting to restore ticket type ${id} for organization ${authenticatedOrganizationId}`,
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket type ID format.');
    }

    // 1. Retrieve existing ticket type (must be deleted)
    const existingTicketType = await this.ticketTypeRepository.findOne({ _id: id, isDeleted: true });
    if (!existingTicketType) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found or is not in a soft-deleted state.`);
    }

    // 2. Authorization Check
    if (existingTicketType.organizationId.toString() !== authenticatedOrganizationId) {
      throw new ForbiddenException('You do not have permission to restore this ticket type.');
    }

    const restoredTicketType = await this.ticketTypeRepository.restore(id, userId);
    this.logger.log(`Successfully restored ticket type with ID: ${id}`);
    return this.mapToResponseDto(restoredTicketType);
  }

  /**
   * Permanently deletes a ticket type. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   * @param id The ID of the ticket type to permanently delete.
   * @returns A success message.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the ticket type is not found.
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to permanently delete ticket type with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket type ID format.');
    }

    // No organizationId check here, as this is likely for a system ADMIN.
    // The controller will enforce the ADMIN role.
    const deletedTicketType = await this.ticketTypeRepository.delete(id);

    if (!deletedTicketType) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found for permanent deletion.`);
    }
    this.logger.log(`Successfully permanently deleted ticket type with ID: ${id}`);
    return { message: `Ticket type with ID "${id}" has been permanently deleted.` };
  }

  /**
   * Atomically increments the quantitySold and decrements the quantity of a ticket type.
   * This is used during the purchase process.
   * @param ticketTypeId The ID of the ticket type.
   * @param quantity The number of tickets to sell.
   * @returns The updated ticket type.
   * @throws NotFoundException if the ticket type is not found or not enough quantity is available.
   * @throws ConflictException if not enough tickets are available.
   * @throws BadRequestException if the ticket type is not active for sale.
   */
  async incrementQuantitySold(ticketTypeId: string, quantity: number): Promise<TicketTypeResponseDto> {
    this.logger.log(`Attempting to sell ${quantity} tickets for ticket type ${ticketTypeId}`);
    if (!Types.ObjectId.isValid(ticketTypeId)) {
      throw new BadRequestException('Invalid ticket type ID format.');
    }
    if (quantity <= 0) {
      throw new BadRequestException('Quantity to sell must be positive.');
    }

    const updatedTicketType = await this.ticketTypeRepository.incrementQuantitySold(ticketTypeId, quantity);

    if (!updatedTicketType) {
      // If update failed, retrieve current state to provide more specific error
      const currentTicketType = await this.ticketTypeRepository.findById(ticketTypeId);
      if (!currentTicketType) {
        throw new NotFoundException(`Ticket type with ID "${ticketTypeId}" not found.`);
      } else if (currentTicketType.quantity < quantity) {
        throw new ConflictException(`Not enough tickets available for ticket type "${ticketTypeId}". Available: ${currentTicketType.quantity}`);
      } else {
        // This covers cases where isActive is false, isDeleted is true, or sales dates are not met.
        throw new BadRequestException(`Ticket type "${ticketTypeId}" is not available for sale (inactive, hidden, or sales period ended).`);
      }
    }
    this.logger.log(`Successfully sold ${quantity} tickets for ticket type ${ticketTypeId}. Remaining: ${updatedTicketType.quantity}`);
    return this.mapToResponseDto(updatedTicketType);
  }

  /**
   * Atomically decrements the quantitySold and increments the quantity of a ticket type.
   * This is used during the refund/cancellation process.
   * @param ticketTypeId The ID of the ticket type.
   * @param quantity The number of tickets to return.
   * @returns The updated ticket type.
   * @throws NotFoundException if the ticket type is not found.
   * @throws ConflictException if not enough quantity was sold to return.
   * @throws BadRequestException if the ticket type is not active for return.
   */
  async decrementQuantitySold(ticketTypeId: string, quantity: number): Promise<TicketTypeResponseDto> {
    this.logger.log(`Attempting to return ${quantity} tickets for ticket type ${ticketTypeId}`);
    if (!Types.ObjectId.isValid(ticketTypeId)) {
      throw new BadRequestException('Invalid ticket type ID format.');
    }
    if (quantity <= 0) {
      throw new BadRequestException('Quantity to return must be positive.');
    }

    const updatedTicketType = await this.ticketTypeRepository.decrementQuantitySold(ticketTypeId, quantity);

    if (!updatedTicketType) {
      // If update failed, retrieve current state to provide more specific error
      const currentTicketType = await this.ticketTypeRepository.findById(ticketTypeId);
      if (!currentTicketType) {
        throw new NotFoundException(`Ticket type with ID "${ticketTypeId}" not found.`);
      } else if (currentTicketType.quantitySold < quantity) {
        throw new ConflictException(`Cannot return ${quantity} tickets for ticket type "${ticketTypeId}". Only ${currentTicketType.quantitySold} were sold.`);
      } else {
        // This covers cases where isActive is false, isDeleted is true, etc.
        throw new BadRequestException(`Ticket type "${ticketTypeId}" is not available for return (inactive, hidden, or deleted).`);
      }
    }
    this.logger.log(`Successfully returned ${quantity} tickets for ticket type ${ticketTypeId}. Remaining sold: ${updatedTicketType.quantitySold}`);
    return this.mapToResponseDto(updatedTicketType);
  }

  /**
   * Retrieves the organization ID associated with a given user.
   * This method is crucial for multi-tenancy enforcement, ensuring that agents
   * can only manage resources within their assigned organization.
   * @param userId The ID of the user.
   * @returns The organization ID as a string, or null if the user is not associated with any organization.
   * @throws BadRequestException if the user ID format is invalid.
   */
  async getOrganizationIdForUser(userId: string): Promise<string | null> {
    // This method is called from EventController and needs to be implemented in OrganizationService.
    // Assuming OrganizationService has a findByOwnerId method that returns organizations.
    // If a user can own multiple organizations, this logic might need to be refined
    // to determine which organization is the "active" one for event/ticket creation.
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format.');
    }
    const organizations = await this.organizationService.findByOwnerId(userId);
    if (!organizations || organizations.length === 0) {
      return null;
    }
    // For simplicity, assuming the first organization found is the one relevant for the user's context.
    // In a real application, you might have a "current organization" selected by the user.
    return organizations[0].id;
  }
}
