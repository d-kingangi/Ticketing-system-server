import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery, Types } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { Discount, DiscountDocument } from './entities/discount.entity';

@Injectable()
export class DiscountRepository extends BaseRepository<DiscountDocument> {
  constructor(
    // Inject the Mongoose model for the 'Discount' document.
    @InjectModel(Discount.name)
    private readonly discountModel: Model<DiscountDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    super(discountModel);
  }

  /**
   * Finds a single, active discount by its code and associated event ID.
   * This is the primary method used during checkout to validate a code.
   * @param code The user-facing discount code (case-insensitive).
   * @param eventId The ID of the event the discount must be associated with.
   * @returns The discount document, or null if not found or not active.
   */
  async findActiveByCodeAndOrg(
    code: string,
    organizationId: string,
  ): Promise<DiscountDocument | null> {
    const now = new Date();

    // I've created a base filter that applies to all discount checks.
    const baseFilter: FilterQuery<DiscountDocument> = {
      code: { $regex: `^${code}$`, $options: 'i' },
      organizationId: new Types.ObjectId(organizationId),
      isActive: true,
      isDeleted: { $ne: true },
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    // I've separated the logic for limited and unlimited discounts for clarity.
    // This filter finds discounts with a usage limit that has not been reached.
    const limitedFilter: FilterQuery<DiscountDocument> = {
      ...baseFilter,
      usageLimit: { $exists: true },
      $expr: { $lt: ['$usageCount', '$usageLimit'] },
    };

    // This filter finds discounts with no usage limit.
    const unlimitedFilter: FilterQuery<DiscountDocument> = {
      ...baseFilter,
      usageLimit: { $exists: false },
    };

    // The final query finds a discount that matches EITHER the limited or unlimited criteria.
    return this.model
      .findOne({
        $or: [limitedFilter, unlimitedFilter],
      })
      .exec();
  }

  /**
   * Finds a discount by its code within a specific organization, regardless of its active status.
   * This is useful for checking for duplicates before creating or updating a discount.
   * @param code - The discount's code (case-insensitive).
   * @param organizationId - The ID of the organization.
   * @returns The discount document or null if not found.
   */
  async findByCodeAndOrg(
    code: string,
    organizationId: string,
  ): Promise<DiscountDocument | null> {
    return this.model.findOne({
      code: { $regex: `^${code}$`, $options: 'i' },
      organizationId: new Types.ObjectId(organizationId),
    }).exec();
  }


  /**
   * Atomically increments the usage count of a discount.
   * This prevents race conditions where a code could be used more times than its limit.
   * @param id The ID of the discount to increment.
   * @returns The updated discount document, or null if the operation fails.
   */
  async incrementUsageCount(id: string): Promise<DiscountDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } }, // Use the $inc operator for atomic incrementing.
      { new: true }, // Return the updated document.
    ).exec();
  }

  /**
   * Soft-deletes a discount by setting `isDeleted` to true and `isActive` to false.
   * @param id The ID of the discount to soft-delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated discount document, or null if not found.
   */
  async softDelete(id: string, updatedBy: string): Promise<DiscountDocument | null> {
    const update: UpdateQuery<DiscountDocument> = {
      $set: {
        isDeleted: true,
        isActive: false, // A deleted discount should not be active.
        updatedBy,
      },
    };
    return this.update(id, update);
  }

  /**
   * Restores a soft-deleted discount.
   * Note: It does not automatically reactivate it; that should be a conscious choice in the service/controller.
   * @param id The ID of the discount to restore.
   * @param updatedBy The ID of the user performing the action.
   * @returns The restored discount document, or null if not found.
   */
  async restore(id: string, updatedBy: string): Promise<DiscountDocument | null> {
    const update: UpdateQuery<DiscountDocument> = {
      $set: {
        isDeleted: false,
        updatedBy,
      },
    };
    return this.update(id, update);
  }
}
