import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery } from 'mongoose';
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
  async findByCodeAndEvent(code: string, eventId: string): Promise<DiscountDocument | null> {
    const now = new Date();
    const filter: FilterQuery<DiscountDocument> = {
      // Match the code case-insensitively.
      code: { $regex: `^${code}$`, $options: 'i' },
      eventId: eventId,
      isActive: true,
      isDeleted: false,
      // Ensure the current date is within the discount's valid period.
      startDate: { $lte: now },
      endDate: { $gte: now },
      // Ensure the usage limit has not been reached.
      // This uses a MongoDB expression to compare two fields in the document.
      $expr: { $lt: ['$usageCount', '$usageLimit'] },
    };

    // A special case for discounts without a usage limit.
    // We need to handle this separately because the $expr above would fail.
    const filterWithoutUsageLimit: FilterQuery<DiscountDocument> = {
      ...filter,
      usageLimit: { $exists: false }, // Find documents where usageLimit is not set.
    };
    // Remove the $expr from the original filter if we are checking for unlimited usage.
    delete filter.$expr;


    // Try to find a discount that has a usage limit and is not yet exhausted,
    // OR find a discount that has no usage limit.
    return this.model.findOne({
      $or: [
        filter,
        filterWithoutUsageLimit,
      ],
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
