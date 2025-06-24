import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { Event, EventDocument } from './entities/event.entity';

/**
 * Repository for the Event collection.
 * Extends the generic BaseRepository and can include methods
 * specific to event data access logic.
 */
@Injectable()
export class EventRepository extends BaseRepository<EventDocument> {
  constructor(
    // Inject the Mongoose model for the 'Event' document.
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    super(eventModel);
  }

  /**
   * Soft-deletes an event by setting its isDeleted flag to true.
   * This is a custom method specific to the Event repository.
   * @param eventId The ID of the event to soft-delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated event document, or null if not found.
   */
  async softDelete(
    eventId: string,
    updatedBy: string,
  ): Promise<EventDocument | null> {
    // Prepare the update payload to mark the document as deleted.
    const update: UpdateQuery<EventDocument> = {
      $set: {
        isDeleted: true,
        updatedBy: updatedBy,
        // Note: We are not using a 'deletedAt' field as it's not in the current BaseDocument schema.
        // If you add 'deletedAt' to your BaseDocument, you would set it here:
        // deletedAt: new Date(),
      },
    };

    // Use the base Mongoose model to find and update the document.
    // The service layer is responsible for ensuring the user has permission to call this method.
    return this.model
      .findByIdAndUpdate(eventId, update, { new: true })
      .exec();
  }

  /**
   * Restores a soft-deleted event by setting its isDeleted flag to false.
   * This is a custom method specific to the Event repository.
   * @param eventId The ID of the event to restore.
   * @param updatedBy The ID of the user performing the action.
   * @returns The restored event document, or null if not found.
   */
  async restore(
    eventId: string,
    updatedBy: string,
  ): Promise<EventDocument | null> {
    // Prepare the update payload to mark the document as not deleted.
    const update: UpdateQuery<EventDocument> = {
      $set: {
        isDeleted: false,
        updatedBy: updatedBy,
        // If you add 'deletedAt' to your BaseDocument, you would clear it here:
        // deletedAt: null,
      },
    };

    // Use the base Mongoose model to find and update the document.
    return this.model
      .findByIdAndUpdate(eventId, update, { new: true })
      .exec();
  }

 
  async findUpcomingEventsByOrganization(organizationId: string): Promise<EventDocument[]> {
    const filter = {
      organizationId: organizationId,
      startDateTime: { $gte: new Date() },
      isDeleted: false,
    };
    return this.findAll(filter, null, { sort: { startDateTime: 1 } });
  }
}
