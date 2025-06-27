import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Types, FilterQuery } from 'mongoose';
import { EventService } from 'src/event/event.service';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { TicketTypeService } from 'src/ticket-type/ticket-type.service';
import { FindAllPurchasesQueryDto } from './dto/find-all-purchase-query.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
import { PurchaseDocument, PaymentStatus, PurchaseTicketItem } from './entities/purchase.entity';
import { PurchaseRepository } from './purchase.repository';
import { UsersService } from 'src/users/users.service';
import { DiscountService } from 'src/discount/discount.service';
import { DiscountDocument } from '../discount/entities/discount.entity'; // CHANGE: Import DiscountDocument
import { DiscountType } from 'src/discount/enum/discount-type.enum';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly eventService: EventService,
    private readonly ticketTypeService: TicketTypeService,
    private readonly usersService: UsersService, // Assuming a UserService for buyer validation
    private readonly discountService: DiscountService, // CHANGE: Inject DiscountService

    // private readonly ticketService: TicketService, // TODO: Inject TicketService when implemented for ticket generation
  ) { }

  /**
   * Maps a PurchaseDocument to a public-facing PurchaseResponseDto.
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
      // CHANGE: Map the simplified ticket item structure.
      tickets: purchase.tickets.map((item) => ({
        ticketTypeId: item.ticketTypeId.toString(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
      })),
      totalAmount: purchase.totalAmount,
      currency: purchase.currency,
      paymentStatus: purchase.paymentStatus,
      paymentMethod: purchase.paymentMethod,
      // CHANGE: Add the new discount-related fields to the response.
      appliedDiscountId: purchase.appliedDiscountId?.toString(),
      discountAmountSaved: purchase.discountAmountSaved,
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
    const { eventId, tickets, discountCode } = createPurchaseDto;
    this.logger.log(`User ${buyerId} creating purchase for event ${eventId} with code: ${discountCode || 'N/A'}`);

    // 1. Validate Buyer and Event
    const buyer = await this.usersService.findOne(buyerId);
    if (!buyer) {
      throw new NotFoundException(`Buyer with ID "${buyerId}" not found.`);
    }
    const event = await this.eventService.findOnePublic(eventId);
    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found.`);
    }

    // --- CHANGE: Validate discount code BEFORE processing tickets ---
    let validDiscount: DiscountDocument | null = null;
    if (discountCode) {
      try {
        // Use the discount service to find and validate the code for the given event.
        // This will throw an error if the code is invalid, expired, or used up.
        validDiscount = await this.discountService.validateAndApplyDiscount(discountCode, eventId);
        this.logger.log(`Applying valid discount ${validDiscount.code} to purchase.`);
      } catch (error) {
        this.logger.warn(`Invalid discount code "${discountCode}" attempted for event ${eventId}: ${error.message}`);
        throw new BadRequestException(error.message);
      }
    }

    // 2. Process Ticket Items and Calculate Total
    let subtotal = 0;
    let totalDiscountAmount = 0;
    const purchaseItems: PurchaseTicketItem[] = [];
    const firstTicketType = await this.ticketTypeService.findOne(tickets[0].ticketTypeId);
    const commonCurrency = firstTicketType.currency;

    for (const itemDto of tickets) {
      const ticketType = await this.ticketTypeService.findOne(itemDto.ticketTypeId);

      if (ticketType.currency !== commonCurrency) {
        throw new BadRequestException('All ticket types in a single purchase must have the same currency.');
      }
      if (ticketType.quantity < itemDto.quantity) {
        throw new ConflictException(`Not enough tickets available for "${ticketType.name}". Available: ${ticketType.quantity}`);
      }
      // ... (other ticket type validations like sales dates, active status, etc.)

      const basePrice = ticketType.price;
      let itemDiscountValue = 0;

      // --- CHANGE: Apply discount logic to each item ---
      if (validDiscount) {
        const isApplicable =
          validDiscount.applicableTicketTypeIds.length === 0 || // Applies to all ticket types
          validDiscount.applicableTicketTypeIds.some(id => id.toString() === ticketType.id);

        if (isApplicable) {
          if (validDiscount.discountType === DiscountType.FIXED_AMOUNT) {
            itemDiscountValue = validDiscount.discountValue;
          } else if (validDiscount.discountType === DiscountType.PERCENTAGE) {
            itemDiscountValue = basePrice * (validDiscount.discountValue / 100);
          }
        }
      }

      const finalUnitPrice = Math.max(0, basePrice - itemDiscountValue);
      const totalItemDiscount = (basePrice - finalUnitPrice) * itemDto.quantity;

      purchaseItems.push({
        ticketTypeId: new Types.ObjectId(itemDto.ticketTypeId),
        quantity: itemDto.quantity,
        unitPrice: parseFloat(finalUnitPrice.toFixed(2)),
        discountAmount: parseFloat(totalItemDiscount.toFixed(2)),
      });

      subtotal += basePrice * itemDto.quantity;
      totalDiscountAmount += totalItemDiscount;
    }

    const finalTotalAmount = subtotal - totalDiscountAmount;

    // 3. Create Purchase Record
    const newPurchase = await this.purchaseRepository.create({
      buyerId: new Types.ObjectId(buyerId),
      eventId: new Types.ObjectId(eventId),
      organizationId: new Types.ObjectId(event.organizationId),
      tickets: purchaseItems,
      totalAmount: parseFloat(finalTotalAmount.toFixed(2)),
      currency: commonCurrency,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: createPurchaseDto.paymentMethod,
      // CHANGE: Store discount information in the purchase record.
      appliedDiscountId: validDiscount ? validDiscount._id : undefined,
      discountAmountSaved: parseFloat(totalDiscountAmount.toFixed(2)),
    });

    this.logger.log(`Purchase ${newPurchase._id} created with PENDING status.`);
    return this.mapToResponseDto(newPurchase);
  }

  /**
   * Updates the payment status of a purchase.
   * This is where side-effects of a successful payment, like updating inventory
   * and discount usage, should occur.
   */
  async updatePaymentStatus(
    purchaseId: string,
    newPaymentStatus: PaymentStatus,
    paymentDetails?: any,
  ): Promise<PurchaseResponseDto> {
    const purchase = await this.purchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${purchaseId}" not found.`);
    }

    if (newPaymentStatus === PaymentStatus.COMPLETED && purchase.paymentStatus !== PaymentStatus.COMPLETED) {
      // Decrement ticket inventory
      for (const item of purchase.tickets) {
        await this.ticketTypeService.incrementQuantitySold(item.ticketTypeId.toString(), item.quantity);
      }

      // --- CHANGE: Increment discount usage count on successful payment ---
      if (purchase.appliedDiscountId) {
        try {
          await this.discountService.incrementUsageCount(purchase.appliedDiscountId.toString());
          this.logger.log(`Incremented usage count for discount ${purchase.appliedDiscountId}`);
        } catch (error) {
          this.logger.error(`Failed to increment usage count for discount ${purchase.appliedDiscountId}: ${error.message}`);
          // This is a non-critical error for the user, but should be logged for admins.
          // The purchase should still succeed.
        }
      }
      // TODO: Trigger ticket generation
    } else if (newPaymentStatus === PaymentStatus.REFUNDED && purchase.paymentStatus !== PaymentStatus.REFUNDED) {
      // Increment ticket inventory back
      for (const item of purchase.tickets) {
        await this.ticketTypeService.decrementQuantitySold(item.ticketTypeId.toString(), item.quantity);
      }
      // Business Decision: We are NOT decrementing the discount usage count on refund
      // to prevent abuse of limited-use codes.
      // TODO: Invalidate generated tickets
    }

    const updatedPurchase = await this.purchaseRepository.updatePaymentStatus(
      purchaseId,
      newPaymentStatus,
      paymentDetails,
    );

    return this.mapToResponseDto(updatedPurchase);
  }


  /**
   * Finds all purchases with pagination and filtering.
   */
  async findAll(
    queryDto: FindAllPurchasesQueryDto,
    authenticatedUserId?: string,
    authenticatedOrganizationId?: string,
  ): Promise<PaginatedResponseDto<PurchaseResponseDto>> {
    const { page, limit, buyerId, eventId, organizationId, paymentStatus, appliedDiscountId } = queryDto;

    const filter: FilterQuery<PurchaseDocument> = {};

    if (authenticatedUserId) {
      filter.buyerId = new Types.ObjectId(authenticatedUserId);
    } else if (buyerId) {
      filter.buyerId = new Types.ObjectId(buyerId);
    }

    if (authenticatedOrganizationId) {
      filter.organizationId = new Types.ObjectId(authenticatedOrganizationId);
    } else if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    if (eventId) filter.eventId = new Types.ObjectId(eventId);
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    // CHANGE: Add filtering by the applied discount ID.
    if (appliedDiscountId) filter.appliedDiscountId = new Types.ObjectId(appliedDiscountId);

    const paginatedResult = await this.purchaseRepository.findWithPagination(filter, page, limit);

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
