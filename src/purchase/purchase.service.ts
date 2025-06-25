import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Types, FilterQuery } from 'mongoose';
import { EventService } from 'src/event/event.service';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { SupportedCurrencies } from 'src/ticket-type/entities/ticket-type.entity';
import { TicketTypeService } from 'src/ticket-type/ticket-type.service';
import { FindAllPurchasesQueryDto } from './dto/find-all-purchase-query.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
import { PurchaseDocument, PaymentStatus } from './entities/purchase.entity';
import { PurchaseRepository } from './purchase.repository';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly eventService: EventService,
    private readonly ticketTypeService: TicketTypeService,
    private readonly usersService: UsersService, // Assuming a UserService for buyer validation
    // private readonly ticketService: TicketService, // TODO: Inject TicketService when implemented for ticket generation
  ) {}

  /**
   * Maps a PurchaseDocument to a public-facing PurchaseResponseDto.
   * @param purchase The purchase document from the database.
   * @returns The mapped DTO.
   */
  private mapToResponseDto(purchase: PurchaseDocument): PurchaseResponseDto {
    if (!purchase) {
      return null;
    }
    return {
      id: purchase._id.toString(),
      buyerId: purchase.buyerId.toString(),
      eventId: purchase.eventId.toString(),
      organizationId: purchase.organizationId.toString(),
      tickets: purchase.tickets.map((item) => ({
        ticketTypeId: item.ticketTypeId.toString(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountApplied: item.discountApplied,
        discountDetails: item.discountDetails,
      })),
      totalAmount: purchase.totalAmount,
      currency: purchase.currency,
      paymentStatus: purchase.paymentStatus,
      paymentMethod: purchase.paymentMethod,
      paymentDetails: purchase.paymentDetails
        ? {
            transactionId: purchase.paymentDetails.transactionId,
            paymentDate: purchase.paymentDetails.paymentDate,
            paymentReference: purchase.paymentDetails.paymentReference,
            paymentGatewayResponse: purchase.paymentDetails.paymentGatewayResponse,
            paymentProvider: purchase.paymentDetails.paymentProvider,
            paymentChannel: purchase.paymentDetails.paymentChannel,
          }
        : undefined,
      ticketsGenerated: purchase.ticketsGenerated,
      ipAddress: purchase.ipAddress,
      userAgent: purchase.userAgent,
      notes: purchase.notes,
      // refundAmount: purchase.refundAmount,
      // refunds: purchase.refunds.map((refund) => ({
      //   refundId: refund.refundId,
      //   amount: refund.amount,
      //   refundDate: refund.refundDate,
      //   reason: refund.reason,
      //   processedBy: refund.processedBy?.toString(),
      // })),
      isDeleted: purchase.isDeleted,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      updatedBy: purchase.updatedBy,
    };
  }

  /**
   * Initiates a new purchase. This involves validating ticket types, calculating total,
   * reserving inventory, and creating a PENDING purchase record.
   * @param createPurchaseDto DTO containing purchase details.
   * @param buyerId The ID of the user making the purchase.
   * @param ipAddress The IP address of the buyer.
   * @param userAgent The user agent string of the buyer's device.
   * @returns The created purchase record.
   * @throws BadRequestException for invalid data or insufficient tickets.
   * @throws NotFoundException if event or ticket types are not found.
   * @throws ConflictException if tickets are oversold.
   */
  async create(
    createPurchaseDto: CreatePurchaseDto,
    buyerId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PurchaseResponseDto> {
    this.logger.log(`User ${buyerId} attempting to create a purchase for event ${createPurchaseDto.eventId}`);

    // 1. Validate Buyer ID
    if (!Types.ObjectId.isValid(buyerId)) {
      throw new BadRequestException('Invalid buyer ID format.');
    }
    const buyer = await this.usersService.findOne(buyerId); // Assuming findOne in UserService
    if (!buyer) {
      throw new NotFoundException(`Buyer with ID "${buyerId}" not found.`);
    }

    // 2. Validate Event
    if (!Types.ObjectId.isValid(createPurchaseDto.eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }
    const event = await this.eventService.findOnePublic(createPurchaseDto.eventId); // Assuming public access to event details
    if (!event) {
      throw new NotFoundException(`Event with ID "${createPurchaseDto.eventId}" not found.`);
    }

    // 3. Process Ticket Items and Calculate Total
    let totalAmount = 0;
    let purchaseItems: PurchaseDocument['tickets'] = [];
    let commonCurrency: SupportedCurrencies | null = null;

    for (const itemDto of createPurchaseDto.tickets) {
      if (!Types.ObjectId.isValid(itemDto.ticketTypeId)) {
        throw new BadRequestException(`Invalid ticket type ID format for item: ${itemDto.ticketTypeId}`);
      }

      const ticketType = await this.ticketTypeService.findOne(itemDto.ticketTypeId); // Assuming public access to ticket types
      if (!ticketType) {
        throw new NotFoundException(`Ticket type with ID "${itemDto.ticketTypeId}" not found.`);
      }

      // Ensure all ticket types belong to the same event and organization
      if (ticketType.eventId.toString() !== event.id) {
        throw new BadRequestException(`Ticket type "${ticketType.name}" does not belong to event "${event.title}".`);
      }
      if (ticketType.organizationId.toString() !== event.organizationId) {
        throw new BadRequestException(`Ticket type "${ticketType.name}" does not belong to event's organization.`);
      }

      // Validate currency consistency
      if (!commonCurrency) {
        commonCurrency = ticketType.currency;
      } else if (commonCurrency !== ticketType.currency) {
        throw new BadRequestException('All ticket types in a single purchase must have the same currency.');
      }

      // Check sales period and availability
      const now = new Date();
      if (
        !ticketType.isActive ||
        ticketType.isDeleted ||
        ticketType.isHidden ||
        now < ticketType.salesStartDate ||
        now > ticketType.salesEndDate ||
        (ticketType.availableUntil && now > ticketType.availableUntil)
      ) {
        throw new BadRequestException(`Ticket type "${ticketType.name}" is not currently available for sale.`);
      }

      // Check quantity limits
      if (itemDto.quantity < ticketType.minPurchaseQuantity) {
        throw new BadRequestException(`Minimum purchase quantity for "${ticketType.name}" is ${ticketType.minPurchaseQuantity}.`);
      }
      if (ticketType.maxPurchaseQuantity && itemDto.quantity > ticketType.maxPurchaseQuantity) {
        throw new BadRequestException(`Maximum purchase quantity for "${ticketType.name}" is ${ticketType.maxPurchaseQuantity}.`);
      }
      // TODO: Implement purchaseLimitPerUser check (requires tracking user's past purchases)

      // Calculate unit price considering discounts
      const unitPrice = this.ticketTypeService.calculateFinalPrice(ticketType, itemDto.quantity);

      // Check if enough tickets are available (optimistic check before atomic update)
      if (ticketType.quantity < itemDto.quantity) {
        throw new ConflictException(`Not enough tickets available for "${ticketType.name}". Available: ${ticketType.quantity}`);
      }

      purchaseItems.push({
        ticketTypeId: new Types.ObjectId(itemDto.ticketTypeId),
        quantity: itemDto.quantity,
        unitPrice: unitPrice,
        discountApplied: unitPrice < ticketType.price, // Simple check if price is less than original
        discountDetails: unitPrice < ticketType.price ? {
          type: ticketType.discountType,
          value: ticketType.discountValue,
          code: ticketType.discountCode,
        } : undefined,
      });
      totalAmount += unitPrice * itemDto.quantity;
    }

    if (!commonCurrency) {
      throw new BadRequestException('No valid ticket types provided for purchase.');
    }

    // 4. Create Purchase Record (PENDING status)
    try {
      const newPurchase = await this.purchaseRepository.create({
        buyerId: new Types.ObjectId(buyerId),
        eventId: new Types.ObjectId(event.id),
        organizationId: new Types.ObjectId(event.organizationId),
        tickets: purchaseItems,
        totalAmount: parseFloat(totalAmount.toFixed(2)), // Ensure total is correctly formatted
        currency: commonCurrency,
        paymentStatus: PaymentStatus.PENDING, // Initial status
        paymentMethod: createPurchaseDto.paymentMethod,
        ipAddress: ipAddress,
        userAgent: userAgent,
        notes: createPurchaseDto.notes,
        ticketsGenerated: false, // Tickets are not generated yet
      });

      this.logger.log(`Purchase ${newPurchase._id} created with PENDING status.`);
      return this.mapToResponseDto(newPurchase);
    } catch (error) {
      this.logger.error(`Failed to create purchase: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Updates the payment status of a purchase. This is typically called by a payment gateway webhook.
   * @param purchaseId The ID of the purchase to update.
   * @param newPaymentStatus The new payment status.
   * @param paymentDetails Optional details from the payment gateway.
   * @returns The updated purchase record.
   * @throws NotFoundException if the purchase is not found.
   * @throws BadRequestException if the payment status transition is invalid.
   * @throws ConflictException if inventory update fails (e.g., oversold).
   */
  async updatePaymentStatus(
    purchaseId: string,
    newPaymentStatus: PaymentStatus,
    paymentDetails?: {
      transactionId?: string;
      paymentDate?: Date;
      paymentReference?: string;
      paymentGatewayResponse?: Record<string, any>;
      paymentProvider?: string;
      paymentChannel?: string;
    },
  ): Promise<PurchaseResponseDto> {
    this.logger.log(`Updating payment status for purchase ${purchaseId} to ${newPaymentStatus}`);
    if (!Types.ObjectId.isValid(purchaseId)) {
      throw new BadRequestException('Invalid purchase ID format.');
    }

    const purchase = await this.purchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${purchaseId}" not found.`);
    }

    // Prevent updating already completed/refunded purchases (unless specific transitions are allowed)
    if (
      purchase.paymentStatus === PaymentStatus.COMPLETED ||
      purchase.paymentStatus === PaymentStatus.REFUNDED
    ) {
      if (newPaymentStatus !== PaymentStatus.REFUNDED) { // Allow refunding a completed purchase
        throw new BadRequestException(`Cannot change status of a ${purchase.paymentStatus} purchase.`);
      }
    }

    // Handle status transitions and side effects
    if (newPaymentStatus === PaymentStatus.COMPLETED && purchase.paymentStatus !== PaymentStatus.COMPLETED) {
      // If payment is now completed, decrement ticket type quantities
      for (const item of purchase.tickets) {
        try {
          await this.ticketTypeService.incrementQuantitySold(
            item.ticketTypeId.toString(),
            item.quantity,
          );
        } catch (error) {
          this.logger.error(
            `Failed to update inventory for ticket type ${item.ticketTypeId} during purchase completion ${purchaseId}: ${error.message}`,
            error.stack,
          );
          // This is a critical error: payment received but inventory not updated.
          // You might want to log this, alert an admin, or even initiate an automatic refund.
          throw new ConflictException(
            `Failed to update ticket inventory for purchase ${purchaseId}. Please contact support.`,
          );
        }
      }
      // TODO: Trigger actual ticket generation here (call TicketService.generateTickets)
      // await this.ticketService.generateTickets(purchaseId, purchase.tickets, purchase.buyerId, purchase.eventId, purchase.organizationId);
      this.logger.log(`Tickets marked for generation for purchase ${purchaseId}.`);
    } else if (newPaymentStatus === PaymentStatus.REFUNDED && purchase.paymentStatus !== PaymentStatus.REFUNDED) {
      // If purchase is being refunded, increment ticket type quantities back
      for (const item of purchase.tickets) {
        try {
          await this.ticketTypeService.decrementQuantitySold(
            item.ticketTypeId.toString(),
            item.quantity,
          );
        } catch (error) {
          this.logger.error(
            `Failed to update inventory for ticket type ${item.ticketTypeId} during purchase refund ${purchaseId}: ${error.message}`,
            error.stack,
          );
          // This is a critical error: refund processed but inventory not updated.
          throw new InternalServerErrorException(
            `Failed to update ticket inventory during refund for purchase ${purchaseId}. Manual intervention required.`,
          );
        }
      }
      // TODO: Invalidate/cancel generated tickets here (call TicketService.invalidateTickets)
      // await this.ticketService.invalidateTickets(purchaseId, userId); // userId of the person processing refund
      this.logger.log(`Tickets marked for invalidation for purchase ${purchaseId}.`);
    }

    const updatedPurchase = await this.purchaseRepository.updatePaymentStatus(
      purchaseId,
      newPaymentStatus,
      paymentDetails,
    );

    if (!updatedPurchase) {
      throw new NotFoundException(`Purchase with ID "${purchaseId}" not found after status update attempt.`);
    }
    this.logger.log(`Purchase ${purchaseId} status updated to ${newPaymentStatus}.`);
    return this.mapToResponseDto(updatedPurchase);
  }

  /**
   * Finds all purchases with pagination and filtering.
   * @param queryDto DTO for pagination and filtering options.
   * @param authenticatedUserId Optional: The ID of the authenticated user (for customer-specific queries).
   * @param authenticatedOrganizationId Optional: The organization ID of the authenticated user (for agent-specific queries).
   * @returns A paginated list of purchases.
   */
  async findAll(
    queryDto: FindAllPurchasesQueryDto,
    authenticatedUserId?: string, // For customers to see only their purchases
    authenticatedOrganizationId?: string, // For agents to see only their org's purchases
  ): Promise<PaginatedResponseDto<PurchaseResponseDto>> {
    this.logger.log(`Fetching all purchases with query: ${JSON.stringify(queryDto)}`);

    const {
      page,
      limit,
      buyerId,
      eventId,
      organizationId,
      paymentStatus,
      paymentMethod,
      currency,
      includeDeleted,
      sortBy,
      sortDirection,
      purchaseDateGte,
      purchaseDateLte,
    } = queryDto;

    const filter: FilterQuery<PurchaseDocument> = {};

    // Enforce buyer ownership if authenticatedUserId is provided (for customers)
    if (authenticatedUserId) {
      filter.buyerId = new Types.ObjectId(authenticatedUserId);
    } else if (buyerId) {
      // Allow filtering by buyerId for admins/agents
      filter.buyerId = new Types.ObjectId(buyerId);
    }

    // Enforce organization ownership if authenticatedOrganizationId is provided (for agents)
    if (authenticatedOrganizationId) {
      filter.organizationId = new Types.ObjectId(authenticatedOrganizationId);
    } else if (organizationId) {
      // Allow filtering by organizationId for admins
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    if (eventId) filter.eventId = new Types.ObjectId(eventId);
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (currency) filter.currency = currency;
    if (!includeDeleted) filter.isDeleted = false;

    if (purchaseDateGte) filter.createdAt = { $gte: purchaseDateGte };
    if (purchaseDateLte) filter.createdAt = { ...filter.createdAt, $lte: purchaseDateLte };

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    const paginatedResult = await this.purchaseRepository.findWithPagination(
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
   * Finds a single purchase by its ID.
   * @param id The ID of the purchase.
   * @param authenticatedUserId Optional: The ID of the authenticated user (for customer-specific access).
   * @param authenticatedOrganizationId Optional: The organization ID of the authenticated user (for agent-specific access).
   * @param includeDeleted Whether to include soft-deleted purchases.
   * @returns The found purchase.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the purchase is not found.
   * @throws ForbiddenException if the user is not authorized to access this purchase.
   */
  async findOne(
    id: string,
    authenticatedUserId?: string,
    authenticatedOrganizationId?: string,
    includeDeleted: boolean = false,
  ): Promise<PurchaseResponseDto> {
    this.logger.log(`Fetching purchase with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase ID format.');
    }

    const filter: FilterQuery<PurchaseDocument> = { _id: id };
    if (!includeDeleted) filter.isDeleted = false;

    const purchase = await this.purchaseRepository.findOne(filter);

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${id}" not found.`);
    }

    // Authorization Check:
    // 1. If authenticatedUserId is provided (customer), ensure they are the buyer.
    if (authenticatedUserId && purchase.buyerId.toString() !== authenticatedUserId) {
      throw new ForbiddenException('You do not have permission to access this purchase.');
    }
    // 2. If authenticatedOrganizationId is provided (agent), ensure purchase belongs to their organization.
    if (authenticatedOrganizationId && purchase.organizationId.toString() !== authenticatedOrganizationId) {
      throw new ForbiddenException('You do not have permission to access this purchase.');
    }

    return this.mapToResponseDto(purchase);
  }

  /**
   * Soft-deletes a purchase record.
   * This should typically be restricted to admins or specific scenarios.
   * @param id The ID of the purchase to soft-delete.
   * @param userId The ID of the user performing the action.
   * @returns A success message.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the purchase is not found or already soft-deleted.
   */
  async softDelete(id: string, userId: string): Promise<{ message: string }> {
    this.logger.log(`User ${userId} attempting to soft-delete purchase ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase ID format.');
    }

    const existingPurchase = await this.purchaseRepository.findById(id);
    if (!existingPurchase || existingPurchase.isDeleted) {
      throw new NotFoundException(`Purchase with ID "${id}" not found or already deleted.`);
    }

    // Additional authorization checks can be added here (e.g., only admin or buyer can soft delete)
    // For now, assuming controller handles roles.

    await this.purchaseRepository.softDelete(id, userId);
    this.logger.log(`Successfully soft-deleted purchase with ID: ${id}`);
    return { message: `Purchase with ID "${id}" has been successfully deleted.` };
  }

  /**
   * Permanently deletes a purchase record. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   * @param id The ID of the purchase to permanently delete.
   * @returns A success message.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the purchase is not found.
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to permanently delete purchase with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase ID format.');
    }

    const deletedPurchase = await this.purchaseRepository.delete(id);

    if (!deletedPurchase) {
      throw new NotFoundException(`Purchase with ID "${id}" not found for permanent deletion.`);
    }
    this.logger.log(`Successfully permanently deleted purchase with ID: ${id}`);
    return { message: `Purchase with ID "${id}" has been permanently deleted.` };
  }

  /**
   * Initiates a refund for a purchase.
   * This method updates the purchase status to REFUNDED and records refund details.
   * It also triggers inventory adjustments via TicketTypeService.
   * @param purchaseId The ID of the purchase to refund.
   * @param refundAmount The amount to refund.
   * @param reason The reason for the refund.
   * @param processedByUserId The ID of the user processing the refund.
   * @returns The updated purchase record.
   * @throws NotFoundException if the purchase is not found.
   * @throws BadRequestException for invalid refund amount or status.
   * @throws ConflictException if inventory adjustment fails.
   */
  async refundPurchase(
    purchaseId: string,
    refundAmount: number,
    reason: string,
    processedByUserId: string,
  ): Promise<PurchaseResponseDto> {
    this.logger.log(`Initiating refund for purchase ${purchaseId}, amount: ${refundAmount}`);
    if (!Types.ObjectId.isValid(purchaseId)) {
      throw new BadRequestException('Invalid purchase ID format.');
    }
    if (refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be positive.');
    }

    const purchase = await this.purchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${purchaseId}" not found.`);
    }

    if (purchase.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException(`Purchase ${purchaseId} is already fully refunded.`);
    }
    if (purchase.paymentStatus !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Purchase ${purchaseId} is not in a COMPLETED state and cannot be refunded.`);
    }
    if (purchase.refundAmount + refundAmount > purchase.totalAmount) {
      throw new BadRequestException(`Refund amount exceeds total purchase amount. Max refundable: ${purchase.totalAmount - purchase.refundAmount}`);
    }

    // Update inventory for all ticket types in the purchase
    // This assumes a full refund of all tickets. For partial refunds,
    // you'd need to specify which tickets are being refunded.
    for (const item of purchase.tickets) {
      try {
        await this.ticketTypeService.decrementQuantitySold(
          item.ticketTypeId.toString(),
          item.quantity,
        );
      } catch (error) {
        this.logger.error(
          `Failed to update inventory for ticket type ${item.ticketTypeId} during refund ${purchaseId}: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          `Failed to update ticket inventory during refund for purchase ${purchaseId}. Manual intervention required.`,
        );
      }
    }

    // Record refund details
    const newRefund = {
      refundId: new Types.ObjectId().toHexString(), // Generate a unique ID for this refund
      amount: refundAmount,
      refundDate: new Date(),
      reason: reason,
      processedBy: new Types.ObjectId(processedByUserId),
    };

    const updatedPurchase = await this.purchaseRepository.update(
      purchaseId,
      {
        $set: {
          paymentStatus: PaymentStatus.REFUNDED, // Mark as refunded
          refundAmount: purchase.refundAmount + refundAmount,
          updatedBy: processedByUserId,
        },
        $push: { refunds: newRefund }, // Add refund details to the array
      },
    );

    if (!updatedPurchase) {
      throw new NotFoundException(`Purchase with ID "${purchaseId}" not found during refund update.`);
    }

    // TODO: Invalidate/cancel generated tickets here (call TicketService.invalidateTickets)
    // await this.ticketService.invalidateTickets(purchaseId, processedByUserId);

    this.logger.log(`Purchase ${purchaseId} successfully refunded ${refundAmount}.`);
    return this.mapToResponseDto(updatedPurchase);
  }

   /**
   * Retrieves purchases by a specific buyer ID.
   * @param buyerId The ID of the buyer.
   * @returns An array of purchase response DTOs.
   */
  async findByBuyerId(buyerId: string): Promise<PurchaseResponseDto[]> {
    if (!Types.ObjectId.isValid(buyerId)) {
      throw new BadRequestException('Invalid buyer ID format.');
    }
    const purchases = await this.purchaseRepository.findByBuyerId(buyerId);
    return purchases.map(this.mapToResponseDto);
  }

  /**
   * Retrieves purchases by a specific event ID.
   * @param eventId The ID of the event.
   * @returns An array of purchase response DTOs.
   */
  async findByEventId(eventId: string): Promise<PurchaseResponseDto[]> {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }
    const purchases = await this.purchaseRepository.findByEventId(eventId);
    return purchases.map(this.mapToResponseDto);
  }

  /**
   * Retrieves purchases by a specific organization ID.
   * @param organizationId The ID of the organization.
   * @returns An array of purchase response DTOs.
   */
  async findByOrganizationId(organizationId: string): Promise<PurchaseResponseDto[]> {
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException('Invalid organization ID format.');
    }
    const purchases = await this.purchaseRepository.findByOrganizationId(organizationId);
    return purchases.map(this.mapToResponseDto);
  }

  
}
