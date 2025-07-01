import { BadRequestException, ConflictException, ForbiddenException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreatePurchaseDto, PurchaseProductItemDto } from './dto/create-purchase.dto';
import { Types, FilterQuery } from 'mongoose';
import { EventService } from 'src/event/event.service';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { TicketTypeService } from 'src/ticket-type/ticket-type.service';
import { FindAllPurchasesQueryDto } from './dto/find-all-purchase-query.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
import { PurchaseDocument, PaymentStatus, PurchaseTicketItem, PurchaseProductItem } from './entities/purchase.entity';
import { PurchaseRepository } from './purchase.repository';
import { UsersService } from 'src/users/users.service';
import { DiscountService } from 'src/discount/discount.service';
import { DiscountDocument } from '../discount/entities/discount.entity'; // CHANGE: Import DiscountDocument
import { DiscountType } from 'src/discount/enum/discount-type.enum';
import { TicketService } from 'src/ticket/ticket.service';
import { ProductService } from 'src/product/product.service';
import { TicketStatus } from 'src/ticket/entities/ticket.entity';
import { ProductType } from 'src/product/interfaces/product.interfaces';
import { ProductDocument } from 'src/product/entities/product.entity';
import { DiscountScope } from 'src/discount/enum/discount-scope.enum';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly eventService: EventService,
    private readonly ticketTypeService: TicketTypeService,
    private readonly usersService: UsersService,
    private readonly discountService: DiscountService,
    private readonly productService: ProductService,
    @Inject(forwardRef(() => TicketService))
    private readonly ticketService: TicketService,

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
      // I've made eventId optional in the response.
      eventId: purchase.eventId?.toString(),
      organizationId: purchase.organizationId.toString(),
      // I've renamed 'tickets' to 'ticketItems' for consistency.
      ticketItems: purchase.ticketItems.map((item) => ({
        ticketTypeId: item.ticketTypeId.toString(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
      })),
      // I've added the mapping for the new 'productItems'.
      productItems: purchase.productItems.map((item) => ({
        productId: item.productId.toString(),
        variationId: item.variationId?.toString(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
      })),
      totalAmount: purchase.totalAmount,
      currency: purchase.currency,
      paymentStatus: purchase.paymentStatus,
      paymentMethod: purchase.paymentMethod,
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
 * Initiates a new purchase for tickets and/or products.
 */
  async create(
    createPurchaseDto: CreatePurchaseDto,
    buyerId: string,
  ): Promise<PurchaseResponseDto> {
    const { eventId, ticketItems = [], productItems = [], discountCode } = createPurchaseDto;
    this.logger.log(`User ${buyerId} creating purchase with ${ticketItems.length} ticket types and ${productItems.length} product types.`);

    // I'm validating that the cart is not empty.
    if (ticketItems.length === 0 && productItems.length === 0) {
      throw new BadRequestException('A purchase must contain at least one ticket or product.');
    }

    // I'm validating that eventId is present if tickets are being purchased.
    if (ticketItems.length > 0 && !eventId) {
      throw new BadRequestException('eventId is required when purchasing tickets.');
    }

    // I'm fetching the buyer to ensure they exist.
    await this.usersService.findOne(buyerId);

    // I'm determining the organization and currency from the first available item in the cart.
    const { organizationId, currency } = await this.getOrgAndCurrency(eventId, productItems);

    // I'm validating the discount code against the organization.
    const validDiscount = discountCode
      ? await this.discountService.validateCode(discountCode, organizationId)
      : null;

    let subtotal = 0;
    let totalDiscountAmount = 0;
    const processedTicketItems: PurchaseTicketItem[] = [];
    const processedProductItems: PurchaseProductItem[] = [];

    // I'm processing ticket items if they exist.
    if (ticketItems.length > 0) {
      for (const itemDto of ticketItems) {
        const ticketType = await this.ticketTypeService.findOne(itemDto.ticketTypeId, organizationId);
        if (ticketType.eventId !== eventId) throw new BadRequestException(`Ticket type ${ticketType.id} does not belong to event ${eventId}.`);
        if (ticketType.currency !== currency) throw new BadRequestException('All items in a purchase must have the same currency.');
        if (ticketType.quantity < itemDto.quantity) throw new ConflictException(`Not enough tickets for "${ticketType.name}".`);

        const { finalUnitPrice, itemDiscount } = this.calculateItemDiscount(ticketType.price, validDiscount, { ticketTypeId: ticketType.id });
        subtotal += ticketType.price * itemDto.quantity;
        totalDiscountAmount += itemDiscount * itemDto.quantity;

        processedTicketItems.push({
          ticketTypeId: new Types.ObjectId(itemDto.ticketTypeId),
          quantity: itemDto.quantity,
          unitPrice: finalUnitPrice,
          discountAmount: itemDiscount * itemDto.quantity,
        });
      }
    }

    // I'm processing product items if they exist.
    if (productItems.length > 0) {
      for (const itemDto of productItems) {
        const product = await this.productService.findDocById(itemDto.productId, organizationId);
        if (product.currency !== currency) throw new BadRequestException('All items in a purchase must have the same currency.');

        const { price, variation } = this.getProductPriceAndVariation(product, itemDto);
        if (variation && variation.quantity < itemDto.quantity) throw new ConflictException(`Not enough stock for product variation "${variation.sku}".`);
        if (!variation && product.quantity < itemDto.quantity) throw new ConflictException(`Not enough stock for product "${product.name}".`);

        const { finalUnitPrice, itemDiscount } = this.calculateItemDiscount(price, validDiscount, { productId: product.id, categoryId: product.productCategoryId.toString() });
        subtotal += price * itemDto.quantity;
        totalDiscountAmount += itemDiscount * itemDto.quantity;

        processedProductItems.push({
          productId: new Types.ObjectId(itemDto.productId),
          variationId: variation ? new Types.ObjectId(variation._id) : undefined,
          quantity: itemDto.quantity,
          unitPrice: finalUnitPrice,
          discountAmount: itemDiscount * itemDto.quantity,
        });
      }
    }

    // I'm creating the final purchase record in the database.
    const newPurchase = await this.purchaseRepository.create({
      buyerId: new Types.ObjectId(buyerId),
      eventId: eventId ? new Types.ObjectId(eventId) : undefined,
      organizationId: new Types.ObjectId(organizationId),
      ticketItems: processedTicketItems,
      productItems: processedProductItems,
      totalAmount: subtotal - totalDiscountAmount,
      currency,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: createPurchaseDto.paymentMethod,
      appliedDiscountId: validDiscount ? new Types.ObjectId(validDiscount.id) : undefined,
      discountAmountSaved: totalDiscountAmount,
      createdBy: buyerId,
      updatedBy: buyerId,
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
      // I'm decrementing stock for both tickets and products.
      for (const item of purchase.ticketItems) {
        await this.ticketTypeService.incrementQuantitySold(item.ticketTypeId.toString(), item.quantity);
      }
      for (const item of purchase.productItems) {
        await this.productService.decrementStock(item.productId.toString(), item.quantity, item.variationId?.toString());
      }

      if (purchase.appliedDiscountId) {
        await this.discountService.incrementUsageCount(purchase.appliedDiscountId.toString());
      }
      // I'm now generating the individual ticket documents.
      await this.ticketService.generateTicketsForPurchase(purchase);

    } else if (newPaymentStatus === PaymentStatus.REFUNDED && purchase.paymentStatus !== PaymentStatus.REFUNDED) {
      // I'm incrementing stock back for both tickets and products.
      for (const item of purchase.ticketItems) {
        await this.ticketTypeService.decrementQuantitySold(item.ticketTypeId.toString(), item.quantity);
      }
      for (const item of purchase.productItems) {
        await this.productService.incrementStock(item.productId.toString(), item.quantity, item.variationId?.toString());
      }
      // I'm now invalidating the previously generated tickets.
      await this.ticketService.invalidateTicketsByPurchaseId(purchase.id, TicketStatus.REFUNDED, purchase.updatedBy);
    }

    const updatedPurchase = await this.purchaseRepository.updatePaymentStatus(
      purchaseId,
      newPaymentStatus,
      paymentDetails,
    );

    return this.mapToResponseDto(updatedPurchase);
  }

  private async getOrgAndCurrency(eventId?: string, productItems?: PurchaseProductItemDto[]): Promise<{ organizationId: string, currency: SupportedCurrencies }> {
    if (eventId) {
      const event = await this.eventService.findOnePublic(eventId);
      return { organizationId: event.organizationId, currency: event.currency };
    }
    if (productItems && productItems.length > 0) {
      const product = await this.productService.findDocById(productItems[0].productId);
      return { organizationId: product.organizationId.toString(), currency: product.currency };
    }
    throw new InternalServerErrorException('Could not determine organization and currency for the purchase.');
  }

  /**
   * I've created this helper to get the correct price and variation from a product DTO.
   */
  private getProductPriceAndVariation(product: ProductDocument, itemDto: PurchaseProductItemDto): { price: number, variation?: Variation } {
    if (product.productType === ProductType.SIMPLE) {
      return { price: this.productService.getCurrentPrice(product) };
    }
    if (product.productType === ProductType.VARIABLE) {
      if (!itemDto.variationId) throw new BadRequestException(`variationId is required for variable product ${product.name}.`);
      const variation = product.variations.find(v => v._id.toString() === itemDto.variationId);
      if (!variation) throw new NotFoundException(`Variation with ID ${itemDto.variationId} not found in product ${product.name}.`);
      return { price: this.productService.getCurrentPrice(product, variation), variation };
    }
    throw new InternalServerErrorException('Unsupported product type encountered.');
  }


  /**
   * I've refactored the discount calculation into its own reusable method.
   */
  private calculateItemDiscount(
    basePrice: number,
    discount: DiscountDocument | null,
    item: { ticketTypeId?: string, productId?: string, categoryId?: string }
  ): { finalUnitPrice: number, itemDiscount: number } {
    let itemDiscountValue = 0;
    if (discount) {
      const isApplicable =
        (discount.scope === DiscountScope.EVENT &&
          item.ticketTypeId &&
          (discount.applicableTicketTypeIds.length === 0 ||
            discount.applicableTicketTypeIds.map(id => id.toString()).includes(item.ticketTypeId))) ||
        (discount.scope === DiscountScope.PRODUCT &&
          item.productId &&
          (
            (discount.applicableProductIds.length === 0 && discount.applicableProductCategoryIds.length === 0) ||
            discount.applicableProductIds.map(id => id.toString()).includes(item.productId) ||
            (item.categoryId && discount.applicableProductCategoryIds.map(id => id.toString()).includes(item.categoryId))
          ));

      if (isApplicable) {
        if (discount.discountType === DiscountType.FIXED_AMOUNT) {
          itemDiscountValue = discount.discountValue;
        } else if (discount.discountType === DiscountType.PERCENTAGE) {
          itemDiscountValue = basePrice * (discount.discountValue / 100);
        }
      }
    }
    const finalUnitPrice = Math.max(0, basePrice - itemDiscountValue);
    const itemDiscount = basePrice - finalUnitPrice;
    return { finalUnitPrice, itemDiscount };
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
    if (appliedDiscountId) filter.appliedDiscountId = new Types.ObjectId(appliedDiscountId);

    const paginatedResult = await this.purchaseRepository.findWithPagination(filter, page, limit);

    return new PaginatedResponseDto({
      data: paginatedResult.data.map(p => this.mapToResponseDto(p)),
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

    const filter: FilterQuery<PurchaseDocument> = { _id: new Types.ObjectId(id) };
    if (!includeDeleted) filter.isDeleted = { $ne: true };

    const purchase = await this.purchaseRepository.findOne(filter);

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${id}" not found.`);
    }

    if (authenticatedUserId && purchase.buyerId.toString() !== authenticatedUserId) {
      throw new ForbiddenException('You do not have permission to access this purchase.');
    }
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
    const purchase = await this.findOne(id, undefined, undefined, true); // Find it first to ensure it exists
    await this.purchaseRepository.softDelete(purchase.id, userId);
    this.logger.log(`Successfully soft-deleted purchase with ID: ${id}`);
    return { message: `Purchase with ID "${id}" has been successfully deleted.` };
  }

  /**
   * Permanently deletes a purchase record.
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to permanently delete purchase with ID: ${id}`);
    const purchase = await this.findOne(id, undefined, undefined, true); // Find it first
    await this.purchaseRepository.delete(purchase.id);
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

    // I'm calling the updatePaymentStatus method to handle inventory restoration and ticket invalidation.
    const updatedPurchase = await this.updatePaymentStatus(purchaseId, PaymentStatus.REFUNDED);

    // I'm now adding the specific refund transaction details.
    const newRefund = {
      refundId: new Types.ObjectId().toHexString(),
      amount: refundAmount,
      refundDate: new Date(),
      reason: reason,
      processedBy: new Types.ObjectId(processedByUserId),
    };

    const finalPurchase = await this.purchaseRepository.update(
      purchaseId,
      {
        $set: {
          refundAmount: purchase.refundAmount + refundAmount,
          updatedBy: processedByUserId,
        },
        $push: { refunds: newRefund },
      },
    );

    if (!finalPurchase) {
      throw new NotFoundException(`Purchase with ID "${purchaseId}" not found during refund update.`);
    }

    this.logger.log(`Purchase ${purchaseId} successfully refunded ${refundAmount}.`);
    return this.mapToResponseDto(finalPurchase);
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
