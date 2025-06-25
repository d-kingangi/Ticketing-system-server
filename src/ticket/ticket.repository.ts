import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery, FilterQuery, Types } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { Ticket, TicketDocument, TicketStatus } from './entities/ticket.entity';

/**
 * Repository for the Ticket collection.
 * Extends the generic BaseRepository and includes methods
 * specific to ticket data access logic.
 */
@Injectable()
export class TicketRepository extends BaseRepository<TicketDocument> {
  constructor(
    // Inject the Mongoose model for the 'Ticket' document.
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    super(ticketModel);
  }

  /**
   * Finds a single ticket by its unique ticket code.
   * This is a primary method for ticket validation and check-in.
   * @param ticketCode The unique code of the ticket.
   * @returns The ticket document, or null if not found.
   */
  async findByTicketCode(ticketCode: string): Promise<TicketDocument | null> {
    return this.findOne({ ticketCode });
  }

  /**
   * Finds all tickets belonging to a specific owner.
   * @param ownerId The ID of the ticket owner (User).
   * @returns An array of ticket documents.
   */
  async findByOwnerId(ownerId: string): Promise<TicketDocument[]> {
    const filter: FilterQuery<TicketDocument> = {
      ownerId: new Types.ObjectId(ownerId),
    };
    return this.findAll(filter);
  }

  /**
   * Finds all tickets generated from a single purchase.
   * @param purchaseId The ID of the purchase record.
   * @returns An array of ticket documents.
   */
  async findByPurchaseId(purchaseId: string): Promise<TicketDocument[]> {
    const filter: FilterQuery<TicketDocument> = {
      purchaseId: new Types.ObjectId(purchaseId),
    };
    return this.findAll(filter);
  }

  /**
   * Finds all tickets for a specific event, optionally filtered by status.
   * @param eventId The ID of the event.
   * @param status Optional ticket status to filter by.
   * @returns An array of ticket documents.
   */
  async findByEventId(eventId: string, status?: TicketStatus): Promise<TicketDocument[]> {
    const filter: FilterQuery<TicketDocument> = {
      eventId: new Types.ObjectId(eventId),
    };
    if (status) {
      filter.status = status;
    }
    return this.findAll(filter);
  }

  /**
   * Updates the status of a specific ticket.
   * @param id The ID of the ticket to update.
   * @param status The new status for the ticket.
   * @param updatedBy The ID of the user performing the update.
   * @returns The updated ticket document, or null if not found.
   */
  async updateStatus(
    id: string,
    status: TicketStatus,
    updatedBy: string,
  ): Promise<TicketDocument | null> {
    const update: UpdateQuery<TicketDocument> = {
      $set: {
        status,
        updatedBy,
      },
    };
    return this.ticketModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Records a ticket scan during check-in.
   * Sets the status to 'used', records the time and staff member, and increments the attempt counter.
   * @param id The ID of the ticket being scanned.
   * @param scannedBy The ID of the user (staff) scanning the ticket.
   * @param checkInLocation Optional location of the scan (e.g., "Gate A").
   * @returns The updated ticket document, or null if not found.
   */
  async recordScan(
    id: string,
    scannedBy: string,
    checkInLocation?: string,
  ): Promise<TicketDocument | null> {
    const update: UpdateQuery<TicketDocument> = {
      $set: {
        status: TicketStatus.USED,
        scannedAt: new Date(),
        scannedBy: new Types.ObjectId(scannedBy),
        checkInLocation,
        updatedBy: scannedBy,
      },
      $inc: { redemptionAttempts: 1 }, // Increment redemption attempts
    };
    return this.ticketModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Transfers a ticket from one owner to another.
   * Updates the ownerId, and logs the history. The ticket status remains VALID for the new owner.
   * @param id The ID of the ticket to transfer.
   * @param oldOwnerId The ID of the current owner.
   * @param newOwnerId The ID of the new owner.
   * @returns The updated ticket document, or null if not found.
   */
  async transferOwner(
    id: string,
    oldOwnerId: string,
    newOwnerId: string,
  ): Promise<TicketDocument | null> {
    const update: UpdateQuery<TicketDocument> = {
      $set: {
        ownerId: new Types.ObjectId(newOwnerId),
        status: TicketStatus.VALID, // The ticket becomes valid for the new owner
        transferredTo: new Types.ObjectId(newOwnerId), // Explicitly track the last transfer
        updatedBy: oldOwnerId, // The user initiating the transfer
      },
      $push: {
        // Add a record to the transfer history
        transferHistory: {
          from: new Types.ObjectId(oldOwnerId),
          to: new Types.ObjectId(newOwnerId),
          date: new Date(),
        },
      },
    };
    return this.ticketModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Invalidates a batch of tickets associated with a specific purchase.
   * This is useful when a purchase is cancelled or refunded.
   * @param purchaseId The ID of the purchase whose tickets should be invalidated.
   * @param newStatus The status to set the tickets to (e.g., CANCELLED or REFUNDED).
   * @param updatedBy The ID of the user performing the action.
   * @returns The result of the bulk update operation from Mongoose.
   */
  async invalidateByPurchaseId(
    purchaseId: string,
    newStatus: TicketStatus.CANCELLED | TicketStatus.REFUNDED,
    updatedBy: string,
  ) {
    const filter: FilterQuery<TicketDocument> = {
      purchaseId: new Types.ObjectId(purchaseId),
    };
    const update: UpdateQuery<TicketDocument> = {
      $set: {
        status: newStatus,
        updatedBy,
      },
    };
    return this.ticketModel.updateMany(filter, update).exec();
  }

  /**
   * Soft-deletes a ticket record.
   * @param id The ID of the ticket to soft-delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated ticket document, or null if not found.
   */
  async softDelete(
    id: string,
    updatedBy: string,
  ): Promise<TicketDocument | null> {
    const update: UpdateQuery<TicketDocument> = {
      $set: {
        isDeleted: true,
        updatedBy: updatedBy,
      },
    };
    return this.ticketModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }
}
