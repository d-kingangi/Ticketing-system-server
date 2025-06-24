import {
  Document,
  Model,
  FilterQuery,
  UpdateQuery,
  ProjectionType,
  PipelineStage,
  QueryOptions,
} from 'mongoose';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';

/**
 * Generic base repository for MongoDB collections with client isolation
 */
@Injectable()
export class BaseRepository<T extends Document> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly model: Model<T>) { }

  /**
   * Protected method to get model - available to subclasses
   */
  protected getModel(): Model<T> {
    return this.model;
  }

  /**
   * Creates a new document.
   * @param createDto - The data for the new document.
   */
  async create(createDto: Partial<T>): Promise<T> {
    try {
      // The createDto is now used directly, as clientId/branchId are not added here.
      const newDocument = new this.model(createDto);
      return await newDocument.save();
    } catch (error) {
      this.logger.error(`Error in create: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Finds all documents matching a given filter.
   * @param filter - The MongoDB filter query.
   * @param projection - The fields to include or exclude.
   * @param options - Query options like limit, skip, and sort.
   */
  async findAll(
    filter: FilterQuery<T> = {},
    projection?: ProjectionType<T>,
    options: QueryOptions<T> = {},
  ): Promise<T[]> {
    try {
      // The filter is now used directly without modification.
      const query = this.model.find(filter, projection, options);
      return await query.exec();
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Finds documents with pagination.
   * @param filter - The MongoDB filter query.
   * @param page - The current page number.
   * @param limit - The number of items per page.
   * @param sort - The sort order.
   */
  async findWithPagination(
    filter: FilterQuery<T> = {},
    page = 1,
    limit = 10,
    sort?: any,
  ): Promise<{ data: T[]; total: number; pages: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    try {
      // The filter is passed directly to both the findAll and countDocuments calls.
      const [data, total] = await Promise.all([
        this.findAll(filter, null, { limit, skip, sort }),
        this.model.countDocuments(filter).exec(),
      ]);

      return {
        data,
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Error in findWithPagination: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a single document by its ID.
   * @param id - The document ID.
   * @param projection - The fields to include or exclude.
   */
  async findById(id: string, projection?: ProjectionType<T>): Promise<T> {
    try {
      // The query is simplified, as it no longer needs to check for clientId.
      const document = await this.model.findById(id, projection).exec();

      if (!document) {
        throw new NotFoundException(`Document with ID ${id} not found`);
      }

      return document;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error in findById: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Finds a single document by a custom filter.
   * @param filter - The MongoDB filter query.
   * @param projection - The fields to include or exclude.
   */
  async findOne(
    filter: FilterQuery<T>,
    projection?: ProjectionType<T>,
  ): Promise<T> {
    try {
      // The filter is used directly without modification.
      const document = await this.model.findOne(filter, projection).exec();

      if (!document) {
        throw new NotFoundException(`Document not found with the given filter`);
      }

      return document;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error in findOne: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Updates a document by its ID.
   * @param id - The ID of the document to update.
   * @param updateDto - The update query.
   */
  async update(id: string, updateDto: UpdateQuery<T>): Promise<T> {
    try {
      // The query is simplified to find by ID only.
      // The service layer is responsible for ensuring the user has permission to update this ID.
      const document = await this.model
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();

      if (!document) {
        throw new NotFoundException(`Document with ID ${id} not found`);
      }

      return document;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error in update: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Deletes a document by its ID. This is a hard delete.
   * @param id - The ID of the document to delete.
   */
  async delete(id: string): Promise<T> {
    try {
      // The query is simplified to find by ID only.
      const document = await this.model.findByIdAndDelete(id).exec();

      if (!document) {
        throw new NotFoundException(`Document with ID ${id} not found`);
      }

      return document;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error in delete: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Counts documents matching a given filter.
   * @param filter - The MongoDB filter query.
   */
  async count(filter: FilterQuery<T>): Promise<number> {
    try {
      // The filter is used directly.
      return await this.model.countDocuments(filter).exec();
    } catch (error) {
      this.logger.error(`Error in count: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Performs an aggregation pipeline.
   * @param pipeline - The MongoDB aggregation pipeline stages.
   */
  async aggregate(pipeline: PipelineStage[]): Promise<any[]> {
    try {
      // The pipeline is executed directly without adding a $match stage.
      return await this.model.aggregate(pipeline).exec();
    } catch (error) {
      this.logger.error(`Error in aggregate: ${error.message}`, error.stack);
      throw error;
    }
  }
}
