import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery, FilterQuery, Types } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { TicketType, TicketTypeDocument } from './entities/ticket-type.entity';

/**
 * Repository for the TicketType collection.
 * Extends the generic BaseRepository and includes methods
 * specific to ticket type data access logic.
 */
@Injectable()
export class TicketTypeRepository extends BaseRepository<TicketTypeDocument> {
  constructor(
    // Inject the Mongoose model for the 'TicketType' document.
    @InjectModel(TicketType.name)
    private readonly ticketTypeModel: Model<TicketTypeDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    super(ticketTypeModel);
  }

  /**
   * Soft-deletes a ticket type by setting its isDeleted flag to true and isActive to false.
   * This method uses `findByIdAndUpdate` directly on the Mongoose model to ensure
   * specific update behavior (e.g., setting multiple fields).
   * @param id The ID of the ticket type to soft-delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated ticket type document, or null if not found.
   */
  async softDelete(
    id: string,
    updatedBy: string,
  ): Promise<TicketTypeDocument | null> {
    const update: UpdateQuery<TicketTypeDocument> = {
      $set: {
        isDeleted: true,
        isActive: false, // Deactivate upon soft deletion
        updatedBy: updatedBy,
      },
    };
    return this.ticketTypeModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Restores a soft-deleted ticket type by setting its isDeleted flag to false and isActive to true.
   * This method uses `findByIdAndUpdate` directly on the Mongoose model.
   * @param id The ID of the ticket type to restore.
   * @param updatedBy The ID of the user performing the action.
   * @returns The restored ticket type document, or null if not found.
   */
  async restore(
    id: string,
    updatedBy: string,
  ): Promise<TicketTypeDocument | null> {
    const update: UpdateQuery<TicketTypeDocument> = {
      $set: {
        isDeleted: false,
        isActive: true, // Reactivate upon restoration
        updatedBy: updatedBy,
      },
    };
    return this.ticketTypeModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Finds all ticket types for a specific event.
   * This method leverages the generic `findAll` from `BaseRepository`.
   * @param eventId The ID of the event.
   * @param includeHidden Whether to include hidden ticket types.
   * @param includeDeleted Whether to include soft-deleted ticket types.
   * @returns An array of ticket type documents.
   */
  async findByEventId(
    eventId: string,
    includeHidden: boolean = false,
    includeDeleted: boolean = false,
  ): Promise<TicketTypeDocument[]> {
    const filter: FilterQuery<TicketTypeDocument> = {
      eventId: new Types.ObjectId(eventId),
    };
    if (!includeHidden) {
      filter.isHidden = false;
    }
    if (!includeDeleted) {
      filter.isDeleted = false;
    }
    return this.findAll(filter);
  }

  /**
   * Finds ticket types by their organization ID.
   * This method leverages the generic `findAll` from `BaseRepository`.
   * @param organizationId The ID of the organization.
   * @param includeHidden Whether to include hidden ticket types.
   * @param includeDeleted Whether to include soft-deleted ticket types.
   * @returns An array of ticket type documents.
   */
  async findByOrganizationId(
    organizationId: string,
    includeHidden: boolean = false,
    includeDeleted: boolean = false,
  ): Promise<TicketTypeDocument[]> {
    const filter: FilterQuery<TicketTypeDocument> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (!includeHidden) {
      filter.isHidden = false;
    }
    if (!includeDeleted) {
      filter.isDeleted = false;
    }
    return this.findAll(filter);
  }

  /**
   * Atomically increments `quantitySold` and decrements `quantity` for a ticket type.
   * This method uses `findOneAndUpdate` with a filter to ensure atomicity and prevent overselling.
   * It only updates if enough tickets are available and the ticket type is active and not deleted.
   * @param id The ID of the ticket type.
   * @param quantityToSell The number of tickets to sell.
   * @returns The updated ticket type document, or null if not found or quantity is insufficient.
   */
  async incrementQuantitySold(
    id: string,
    quantityToSell: number,
  ): Promise<TicketTypeDocument | null> {
    const update: UpdateQuery<TicketTypeDocument> = {
      $inc: {
        quantitySold: quantityToSell,
        quantity: -quantityToSell,
      },
    };
    const filter: FilterQuery<TicketTypeDocument> = {
      _id: new Types.ObjectId(id),
      quantity: { $gte: quantityToSell }, // Only update if enough tickets are available
      isDeleted: false, // Only sell active, non-deleted tickets
      isActive: true,
    };
    return this.ticketTypeModel.findOneAndUpdate(filter, update, { new: true }).exec();
  }

  /**
   * Atomically decrements `quantitySold` and increments `quantity` for a ticket type (e.g., for refunds).
   * This method uses `findOneAndUpdate` with a filter to ensure atomicity and prevent over-refunding.
   * It only updates if enough tickets were sold and the ticket type is active and not deleted.
   * @param id The ID of the ticket type.
   * @param quantityToReturn The number of tickets to return.
   * @returns The updated ticket type document, or null if not found or quantitySold is insufficient.
   */
  async decrementQuantitySold(
    id: string,
    quantityToReturn: number,
  ): Promise<TicketTypeDocument | null> {
    const update: UpdateQuery<TicketTypeDocument> = {
      $inc: {
        quantitySold: -quantityToReturn,
        quantity: quantityToReturn,
      },
    };
    const filter: FilterQuery<TicketTypeDocument> = {
      _id: new Types.ObjectId(id),
      quantitySold: { $gte: quantityToReturn }, // Only update if enough tickets were sold
      isDeleted: false, // Only affect active, non-deleted tickets
      isActive: true,
    };
    return this.ticketTypeModel.findOneAndUpdate(filter, update, { new: true }).exec();
  }

  /**
   * Finds ticket types that are currently on sale (salesStartDate <= now <= salesEndDate) and active.
   * This method leverages the generic `findAll` from `BaseRepository`.
   * @param eventId Optional: Filter by event ID.
   * @param organizationId Optional: Filter by organization ID.
   * @returns An array of ticket type documents.
   */
  async findAvailableForSale(
    eventId?: string,
    organizationId?: string,
  ): Promise<TicketTypeDocument[]> {
    const now = new Date();
    const filter: FilterQuery<TicketTypeDocument> = {
      salesStartDate: { $lte: now },
      salesEndDate: { $gte: now },
      isActive: true,
      isDeleted: false,
      isHidden: false, // Typically, only show non-hidden tickets for sale
      quantity: { $gt: 0 }, // Only show if there are tickets left
    };

    if (eventId) {
      filter.eventId = new Types.ObjectId(eventId);
    }
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    return this.findAll(filter);
  }
}
