import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { EventCategory, EventCategoryDocument } from './entities/event-category.entity';

@Injectable()
export class EventCategoryRepository extends BaseRepository<EventCategoryDocument> {

  constructor(
    @InjectModel(EventCategory.name)
    private readonly eventCategoryModel: Model<EventCategoryDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    // This gives us access to generic CRUD methods like create, findById, etc.
    super(eventCategoryModel);
  }

  /**
   * Finds a single event category by its name (case-insensitive).
   * This is crucial for uniqueness checks before creating a new category.
   * @param name The name of the event category to find.
   * @returns The event category document, or null if not found.
   */
  async findByName(name: string): Promise<EventCategoryDocument | null> {
    const filter: FilterQuery<EventCategoryDocument> = {
      name: { $regex: `^${name}$`, $options: 'i' },
    };
    return this.model.findOne(filter).exec();
  }

  /**
   * Finds all active and non-deleted event categories.
   * This is useful for populating dropdowns in the UI where users select a category for an event.
   * @returns An array of active event category documents.
   */
  async findAllActive(): Promise<EventCategoryDocument[]> {
    const filter: FilterQuery<EventCategoryDocument> = {
      isActive: true,
      isDeleted: false, // Assuming isDeleted comes from BaseDocument
    };
    return this.findAll(filter);
  }

  /**
   * Soft-deletes an event category by setting `isDeleted` to true and `isActive` to false.
   * This is the preferred way to "remove" a category, as it preserves data integrity.
   * @param id The ID of the event category to soft-delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated event category document, or null if not found.
   */
  async softDelete(id: string, updatedBy: string): Promise<EventCategoryDocument | null> {
    const update: UpdateQuery<EventCategoryDocument> = {
      $set: {
        isDeleted: true,
        isActive: false, // An inactive category cannot be used.
        updatedBy,
      },
    };
    // Use the generic update method from BaseRepository.
    return this.update(id, update);
  }

  /**
   * Restores a soft-deleted event category by setting `isDeleted` to false and `isActive` to true.
   * @param id The ID of the event category to restore.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated event category document, or null if not found.
   */
  async restore(id: string, updatedBy: string): Promise<EventCategoryDocument | null> {
    const update: UpdateQuery<EventCategoryDocument> = {
      $set: {
        isDeleted: false,
        isActive: true, // A restored category should be active by default.
        updatedBy,
      },
    };
    // Use the generic update method from BaseRepository.
    return this.update(id, update);
  }
}
