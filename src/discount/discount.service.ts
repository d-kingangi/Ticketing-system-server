import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Types, FilterQuery } from 'mongoose';
import { DiscountRepository } from './discount.repository';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountResponseDto } from './dto/discount-response.dto';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { FindAllDiscountsQueryDto } from './dto/find-all-discounts-query.dto';
import { DiscountDocument } from './entities/discount.entity';
import { EventService } from '../event/event.service';
import { OrganizationService } from '../organization/organization.service';
import { TicketTypeService } from '../ticket-type/ticket-type.service';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(
    private readonly discountRepository: DiscountRepository,
    private readonly eventService: EventService,
    private readonly organizationService: OrganizationService,
    private readonly ticketTypeService: TicketTypeService,
  ) { }

  /**
   * Maps a DiscountDocument to a public-facing DiscountResponseDto.
   */
  private mapToResponseDto(discount: DiscountDocument): DiscountResponseDto {
    if (!discount) return null;
    return {
      id: discount._id.toString(),
      code: discount.code,
      description: discount.description,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      organizationId: discount.organizationId.toString(),
      eventId: discount.eventId.toString(),
      applicableTicketTypeIds: discount.applicableTicketTypeIds.map(id => id.toString()),
      usageLimit: discount.usageLimit,
      usageCount: discount.usageCount,
      startDate: discount.startDate,
      endDate: discount.endDate,
      isActive: discount.isActive,
      isDeleted: discount.isDeleted,
      createdAt: discount.createdAt,
      updatedAt: discount.updatedAt,
    };
  }

  /**
   * Creates a new discount for an event.
   */
  async create(
    createDiscountDto: CreateDiscountDto,
    userId: string,
    organizationId: string,
  ): Promise<DiscountResponseDto> {
    const { eventId, code, applicableTicketTypeIds } = createDiscountDto;
    this.logger.log(`User ${userId} creating discount "${code}" for event ${eventId}`);

    // 1. Verify the user is authorized for the organization of the event.
    await this.organizationService.verifyUserInOrganization(userId, organizationId);
    const event = await this.eventService.findOne(eventId, organizationId);
    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found for your organization.`);
    }

    // 2. Check if a discount with the same code already exists for this event.
    const existingDiscount = await this.discountRepository.findOne({
      code: { $regex: `^${code}$`, $options: 'i' },
      eventId: eventId,
    });
    if (existingDiscount) {
      throw new ConflictException(`A discount with the code "${code}" already exists for this event.`);
    }

    // 3. If specific ticket types are provided, validate they belong to the event.
    if (applicableTicketTypeIds && applicableTicketTypeIds.length > 0) {
      // Fetch all ticket types for the event to validate against.
      const ticketTypes = await this.ticketTypeService.findAll({ eventId }, organizationId);
      const eventTicketTypeIds = new Set(ticketTypes.data.map(tt => tt.id));
      for (const id of applicableTicketTypeIds) {
        if (!eventTicketTypeIds.has(id)) {
          throw new BadRequestException(`Ticket type with ID "${id}" does not belong to event "${eventId}".`);
        }
      }
    }

    // 4. Create the discount.
    const newDiscount = await this.discountRepository.create({
      ...createDiscountDto,
      organizationId: new Types.ObjectId(organizationId),
      eventId: new Types.ObjectId(eventId),
      updatedBy: userId,
    });

    return this.mapToResponseDto(newDiscount);
  }

  /**
   * Finds all discounts with pagination and filtering.
   */
  async findAll(
    queryDto: FindAllDiscountsQueryDto,
    organizationId: string,
  ): Promise<PaginatedResponseDto<DiscountResponseDto>> {
    const { page, limit, eventId, code, isActive, sortBy, sortDirection, includeDeleted } = queryDto;

    const filter: FilterQuery<DiscountDocument> = {
      organizationId: new Types.ObjectId(organizationId),
    };

    if (eventId) filter.eventId = new Types.ObjectId(eventId);
    if (code) filter.code = { $regex: code, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive;
    if (!includeDeleted) filter.isDeleted = false;

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    const paginatedResult = await this.discountRepository.findWithPagination(filter, page, limit, sort);

    return new PaginatedResponseDto({
      data: paginatedResult.data.map(this.mapToResponseDto),
      total: paginatedResult.total,
      currentPage: paginatedResult.page,
      totalPages: paginatedResult.pages,
    });
  }

  /**
   * Finds a single discount by its ID, ensuring it belongs to the correct organization.
   */
  async findOne(id: string, organizationId: string): Promise<DiscountResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid discount ID format.');
    }

    const discount = await this.discountRepository.findOne({
      _id: id,
      organizationId: organizationId,
    });

    if (!discount) {
      throw new NotFoundException(`Discount with ID "${id}" not found for your organization.`);
    }

    return this.mapToResponseDto(discount);
  }

  /**
   * Updates an existing discount.
   */
  async update(
    id: string,
    updateDiscountDto: UpdateDiscountDto,
    userId: string,
    organizationId: string,
  ): Promise<DiscountResponseDto> {
    this.logger.log(`User ${userId} updating discount ${id}`);

    // 1. Verify the discount exists and belongs to the user's organization.
    const existingDiscount = await this.findOne(id, organizationId);

    // 2. If the code is being changed, check for uniqueness within the event.
    if (updateDiscountDto.code && updateDiscountDto.code.toUpperCase() !== existingDiscount.code) {
      const conflictingDiscount = await this.discountRepository.findOne({
        code: { $regex: `^${updateDiscountDto.code}$`, $options: 'i' },
        eventId: existingDiscount.eventId,
        _id: { $ne: id },
      });
      if (conflictingDiscount) {
        throw new ConflictException(`A discount with the code "${updateDiscountDto.code}" already exists for this event.`);
      }
    }

    // 3. Perform the update.
    const updatedDiscount = await this.discountRepository.update(id, {
      ...updateDiscountDto,
      updatedBy: userId,
    });

    return this.mapToResponseDto(updatedDiscount);
  }

  /**
   * Soft-deletes a discount.
   */
  async softDelete(id: string, userId: string, organizationId: string): Promise<{ message: string }> {
    await this.findOne(id, organizationId); // Authorization check
    await this.discountRepository.softDelete(id, userId);
    return { message: `Discount with ID "${id}" successfully deleted.` };
  }

  /**
   * Restores a soft-deleted discount.
   */
  async restore(id: string, userId: string, organizationId: string): Promise<DiscountResponseDto> {
    await this.findOne(id, organizationId); // Authorization check
    const restoredDiscount = await this.discountRepository.restore(id, userId);
    return this.mapToResponseDto(restoredDiscount);
  }

  /**
   * Permanently deletes a discount. (Admin only)
   */
  async hardDelete(id: string, organizationId: string): Promise<{ message: string }> {
    await this.findOne(id, organizationId); // Authorization check
    await this.discountRepository.delete(id);
    return { message: `Discount with ID "${id}" permanently deleted.` };
  }

  /**
   * Validates a discount code for a given event and purchase items.
   * This is the core logic to be called by the PurchaseService.
   */
  async validateAndApplyDiscount(
    code: string,
    eventId: string,
    // purchaseItems: PurchaseItemDto[], // This would be the structure from CreatePurchaseDto
  ): Promise<DiscountDocument> {
    this.logger.log(`Validating discount code "${code}" for event ${eventId}`);
    const discount = await this.discountRepository.findByCodeAndEvent(code, eventId);

    if (!discount) {
      throw new BadRequestException('The provided discount code is invalid, expired, or has reached its usage limit.');
    }

    // Further logic can be added here to check if the items in the cart
    // match the `applicableTicketTypeIds` on the discount.
    // For now, we just return the valid discount document.
    return discount;
  }

  /**
   * Atomically increments the usage count for a given discount.
   * This is called by the PurchaseService after a payment is successfully completed.
   * @param discountId The ID of the discount to increment.
   */
  async incrementUsageCount(discountId: string): Promise<void> {
    this.logger.log(`Incrementing usage count for discount ID: ${discountId}`);
    if (!Types.ObjectId.isValid(discountId)) {
      // Log an error but don't throw, as this shouldn't fail the entire purchase flow.
      this.logger.error(`Invalid discount ID format passed to incrementUsageCount: ${discountId}`);
      return;
    }

    const updatedDiscount = await this.discountRepository.incrementUsageCount(discountId);

    if (!updatedDiscount) {
      // This is an important state to log. It means a purchase was completed with a discount
      // that could not be found for incrementing. This could happen in a race condition
      // if the last available discount was used by another process.
      this.logger.warn(`Could not find discount with ID "${discountId}" to increment usage count.`);
    } else {
      this.logger.log(`Successfully incremented usage count for discount ${discountId}. New count: ${updatedDiscount.usageCount}`);
    }
  }
}
