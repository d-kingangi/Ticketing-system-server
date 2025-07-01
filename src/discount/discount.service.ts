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
import { DiscountScope } from './enum/discount-scope.enum';
import { ProductCategoryService } from 'src/product-category/product-category.service';
import { ProductService } from 'src/product/product.service';

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(
    private readonly discountRepository: DiscountRepository,
    private readonly eventService: EventService,
    private readonly organizationService: OrganizationService,
    private readonly ticketTypeService: TicketTypeService,
    private readonly productService: ProductService,
    private readonly productCategoryService: ProductCategoryService
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
      scope: discount.scope,
      eventId: discount.eventId?.toString(), // eventId is now optional
      applicableTicketTypeIds: discount.applicableTicketTypeIds?.map(id => id.toString()),
      applicableProductIds: discount.applicableProductIds?.map(id => id.toString()),
      applicableProductCategoryIds: discount.applicableProductCategoryIds?.map(id => id.toString()),
      usageLimit: discount.usageLimit,
      usageCount: discount.usageCount,
      startDate: discount.startDate,
      endDate: discount.endDate,
      isActive: discount.isActive,
      isDeleted: discount.isDeleted,
      createdAt: discount.createdAt,
      updatedAt: discount.updatedAt,
      updatedBy: discount.updatedBy?.toString(),
    };
    // --- End of change
  }

  /**
   * Creates a new discount for an event.
   */
  async create(
    createDiscountDto: CreateDiscountDto,
    userId: string,
    organizationId: string,
  ): Promise<DiscountResponseDto> {
    const { code, scope } = createDiscountDto;
    this.logger.log(`User ${userId} creating discount "${code}" with scope ${scope}`);

    // --- Start of change: The conflict check is now against the organization, not the event.
    const existingDiscount = await this.discountRepository.findByCodeAndOrg(code, organizationId);
    if (existingDiscount) {
      throw new ConflictException(`A discount with the code "${code}" already exists for this organization.`);
    }

    if (scope === DiscountScope.EVENT) {
      await this.validateEventScope(createDiscountDto, organizationId);
    } else if (scope === DiscountScope.PRODUCT) {
      await this.validateProductScope(createDiscountDto, organizationId);
    }

    const {
      eventId,
      applicableTicketTypeIds,
      applicableProductIds,
      applicableProductCategoryIds,
      ...rest
    } = createDiscountDto;

    const newDiscount = await this.discountRepository.create({
      ...rest,
      ...(eventId && { eventId: new Types.ObjectId(eventId) }),
      applicableTicketTypeIds: (applicableTicketTypeIds || []).map(id => new Types.ObjectId(id)),
      applicableProductIds: (applicableProductIds || []).map(id => new Types.ObjectId(id)),
      applicableProductCategoryIds: (applicableProductCategoryIds || []).map(id => new Types.ObjectId(id)),
      organizationId: new Types.ObjectId(organizationId),
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
    const { page, limit, eventId, code, isActive, sortBy, sortDirection, includeDeleted, scope } = queryDto;

    const filter: FilterQuery<DiscountDocument> = {
      organizationId: new Types.ObjectId(organizationId),
    };

    // --- Start of change: I've added filtering by the new 'scope' property.
    if (scope) filter.scope = scope;
    // --- End of change
    if (eventId) filter.eventId = new Types.ObjectId(eventId);
    if (code) filter.code = { $regex: code, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive;
    if (!includeDeleted) filter.isDeleted = { $ne: true };

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    const paginatedResult = await this.discountRepository.findWithPagination(filter, page, limit, sort);

    return new PaginatedResponseDto({
      data: paginatedResult.data.map(d => this.mapToResponseDto(d)),
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
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
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

    const existingDiscount = await this.discountRepository.findById(id);
    if (!existingDiscount || existingDiscount.organizationId.toString() !== organizationId) {
      throw new NotFoundException(`Discount with ID "${id}" not found for your organization.`);
    }

    // --- Start of change: I've added logic to prevent changing the scope and to re-validate IDs on update.
    if (updateDiscountDto.scope && updateDiscountDto.scope !== existingDiscount.scope) {
      throw new BadRequestException('Cannot change the scope of an existing discount.');
    }

    if (updateDiscountDto.code && updateDiscountDto.code.toUpperCase() !== existingDiscount.code.toUpperCase()) {
      const conflictingDiscount = await this.discountRepository.findByCodeAndOrg(updateDiscountDto.code, organizationId);
      if (conflictingDiscount && conflictingDiscount._id.toString() !== id) {
        throw new ConflictException(`A discount with the code "${updateDiscountDto.code}" already exists for this organization.`);
      }
    }

    if (existingDiscount.scope === DiscountScope.EVENT) {
      await this.validateEventScope(updateDiscountDto, organizationId, existingDiscount.eventId.toString());
    } else if (existingDiscount.scope === DiscountScope.PRODUCT) {
      await this.validateProductScope(updateDiscountDto, organizationId);
    }
    // --- End of change

    const updatedDiscount = await this.discountRepository.update(id, {
      ...updateDiscountDto,
      updatedBy: new Types.ObjectId(userId),
    });

    return this.mapToResponseDto(updatedDiscount);
  }

  private async validateProductScope(dto: CreateDiscountDto | UpdateDiscountDto, organizationId: string) {
    if (dto.eventId) {
      throw new BadRequestException('eventId cannot be specified for PRODUCT scope discounts.');
    }
    if (dto.applicableProductIds && dto.applicableProductIds.length > 0) {
      // This assumes a method exists in ProductService to validate multiple IDs at once.
      await this.productService.validateProductIdsExist(dto.applicableProductIds, organizationId);
    }
    if (dto.applicableProductCategoryIds && dto.applicableProductCategoryIds.length > 0) {
      // This assumes a method exists in ProductCategoryService to validate multiple IDs at once.
      await this.productCategoryService.validateCategoryIdsExist(dto.applicableProductCategoryIds, organizationId);
    }
  }

  // --- Start of change: I've added private helper methods for scope-specific validation.
  private async validateEventScope(dto: CreateDiscountDto | UpdateDiscountDto, organizationId: string, existingEventId?: string) {
    const eventId = dto.eventId || existingEventId;
    if (!eventId) {
      throw new BadRequestException('eventId is required for EVENT scope discounts.');
    }
    await this.eventService.findOne(eventId, organizationId); // Validates event exists and belongs to org

    if (dto.applicableTicketTypeIds && dto.applicableTicketTypeIds.length > 0) {
      // In a real-world scenario, you would fetch all ticket types for the event and validate against them.
      // For now, we assume ticketTypeService.findAll can handle this.
      const ticketTypes = await this.ticketTypeService.findAll({ eventId }, organizationId);
      const eventTicketTypeIds = new Set(ticketTypes.data.map(tt => tt.id));
      for (const id of dto.applicableTicketTypeIds) {
        if (!eventTicketTypeIds.has(id)) {
          throw new BadRequestException(`Ticket type with ID "${id}" does not belong to event "${eventId}".`);
        }
      }
    }
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

  async validateCode(
    code: string,
    organizationId: string,
  ): Promise<DiscountResponseDto> {
    this.logger.log(`Validating discount code "${code}" for organization ${organizationId}`);
    const discount = await this.discountRepository.findActiveByCodeAndOrg(code, organizationId);

    if (!discount) {
      throw new BadRequestException('The provided discount code is invalid, expired, or has reached its usage limit.');
    }

    // The calling service (e.g., PurchaseService) will receive this DTO
    // and must perform the final check to see if the discount's scope and applicable IDs
    // match any items in the user's cart.
    return this.mapToResponseDto(discount);
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
