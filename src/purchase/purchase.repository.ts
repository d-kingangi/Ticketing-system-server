import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery, FilterQuery, Types } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { Purchase, PurchaseDocument, PaymentStatus } from './entities/purchase.entity';

/**
 * Repository for the Purchase collection.
 * Extends the generic BaseRepository and includes methods
 * specific to purchase data access logic.
 */
@Injectable()
export class PurchaseRepository extends BaseRepository<PurchaseDocument> {
  constructor(
    // Inject the Mongoose model for the 'Purchase' document.
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    super(purchaseModel);
  }

  /**
   * Finds all purchases made by a specific buyer.
   * This method leverages the generic `findAll` from `BaseRepository`.
   * @param buyerId The ID of the buyer.
   * @returns An array of purchase documents.
   */
  async findByBuyerId(buyerId: string): Promise<PurchaseDocument[]> {
    const filter: FilterQuery<PurchaseDocument> = {
      buyerId: new Types.ObjectId(buyerId),
    };
    return this.findAll(filter);
  }

  /**
   * Finds all purchases for a specific event.
   * This method leverages the generic `findAll` from `BaseRepository`.
   * @param eventId The ID of the event.
   * @returns An array of purchase documents.
   */
  async findByEventId(eventId: string): Promise<PurchaseDocument[]> {
    const filter: FilterQuery<PurchaseDocument> = {
      eventId: new Types.ObjectId(eventId),
    };
    return this.findAll(filter);
  }

  /**
   * Finds all purchases for a specific organization.
   * This method leverages the generic `findAll` from `BaseRepository`.
   * @param organizationId The ID of the organization.
   * @returns An array of purchase documents.
   */
  async findByOrganizationId(organizationId: string): Promise<PurchaseDocument[]> {
    const filter: FilterQuery<PurchaseDocument> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    return this.findAll(filter);
  }

  /**
   * Updates the payment status of a purchase.
   * This is a crucial method for handling payment gateway webhooks.
   * @param id The ID of the purchase to update.
   * @param paymentStatus The new payment status.
   * @param paymentDetails Optional payment details from the gateway.
   * @returns The updated purchase document, or null if not found.
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paymentDetails?: {
      transactionId?: string;
      paymentDate?: Date;
      paymentReference?: string;
      paymentGatewayResponse?: Record<string, any>;
    },
  ): Promise<PurchaseDocument | null> {
    const update: UpdateQuery<PurchaseDocument> = {
      $set: {
        paymentStatus,
      },
    };

    if (paymentDetails) {
      // Use dot notation to update nested fields in paymentDetails
      for (const key in paymentDetails) {
        if (paymentDetails[key] !== undefined) {
          update.$set[`paymentDetails.${key}`] = paymentDetails[key];
        }
      }
    }

    // If payment is completed, mark tickets as generated (or ready to be generated)
    if (paymentStatus === PaymentStatus.COMPLETED) {
      update.$set.ticketsGenerated = true;
    }

    return this.purchaseModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Finds purchases with a specific payment status.
   * Useful for background jobs, like cleaning up pending purchases.
   * @param status The payment status to filter by.
   * @returns An array of purchase documents.
   */
  async findByPaymentStatus(status: PaymentStatus): Promise<PurchaseDocument[]> {
    return this.findAll({ paymentStatus: status });
  }

  /**
   * Soft-deletes a purchase record.
   * This is generally less common for purchases but can be useful for GDPR or data cleanup.
   * @param id The ID of the purchase to soft-delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated purchase document, or null if not found.
   */
  async softDelete(
    id: string,
    updatedBy: string,
  ): Promise<PurchaseDocument | null> {
    const update: UpdateQuery<PurchaseDocument> = {
      $set: {
        isDeleted: true,
        updatedBy: updatedBy,
      },
    };
    return this.purchaseModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }
}
