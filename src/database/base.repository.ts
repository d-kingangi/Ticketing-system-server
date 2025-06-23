// src/database/base.repository.ts
import {
  Document,
  Model,
  FilterQuery,
  UpdateQuery,
  ProjectionType,
  PipelineStage,
} from 'mongoose';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';

/**
 * Generic base repository for MongoDB collections with client isolation
 */
@Injectable()
export class BaseRepository<T extends Document> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly model: Model<T>) {}

  /**
   * Protected method to get model - available to subclasses
   */
  protected getModel(): Model<T> {
    return this.model;
  }

  /**
   * Find all documents for a specific client
   */
  async findAll(
    clientId: string,
    filter: FilterQuery<T> = {},
    projection?: ProjectionType<T>,
    options: { limit?: number; skip?: number; sort?: any } = {},
  ): Promise<T[]> {
    // If clientId is provided, add it to filter for client isolation
    const clientFilter = clientId ? { ...filter, clientId } : filter;

    try {
      const query = this.model.find(clientFilter, projection);

      if (options.sort) {
        query.sort(options.sort);
      }

      if (options.skip) {
        query.skip(options.skip);
      }

      if (options.limit) {
        query.limit(options.limit);
      }

      return await query.exec();
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find documents with pagination
   */
  async findWithPagination(
    clientId: string,
    page = 1,
    limit = 10,
    filter: FilterQuery<T> = {},
    projection?: ProjectionType<T>,
    sort?: any,
  ): Promise<{ data: T[]; total: number; pages: number }> {
    // If clientId is provided, add it to filter for client isolation
    const clientFilter = clientId ? { ...filter, clientId } : filter;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.findAll(clientId, filter, projection, { limit, skip, sort }),
        this.model.countDocuments(clientFilter).exec(),
      ]);

      return {
        data,
        total,
        pages: Math.ceil(total / limit),
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
   * Find one document by ID for a specific client
   */
  async findById(
    id: string,
    clientId: string,
    projection?: ProjectionType<T>,
  ): Promise<T> {
    try {
      // Build query based on whether clientId is provided
      const query = clientId ? { _id: id, clientId } : { _id: id };

      const document = await this.model.findOne(query, projection).exec();

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
   * Find one document by custom filter for a specific client
   */
  async findOne(
    filter: FilterQuery<T>,
    clientId: string,
    projection?: ProjectionType<T>,
  ): Promise<T> {
    // If clientId is provided, add it to filter for client isolation
    const clientFilter = clientId ? { ...filter, clientId } : filter;

    try {
      const document = await this.model
        .findOne(clientFilter, projection)
        .exec();

      if (!document) {
        throw new NotFoundException(`Document not found`);
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
   * Create a new document with client association
   */
  async create(createDto: Partial<T>, clientId: string): Promise<T> {
    try {
      // Only add clientId to document if it's provided
      const documentData = clientId ? { ...createDto, clientId } : createDto;

      const newDocument = new this.model(documentData);

      return await newDocument.save();
    } catch (error) {
      this.logger.error(`Error in create: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a document by ID for a specific client
   */
  async update(
    id: string,
    updateDto: UpdateQuery<T>,
    clientId: string,
  ): Promise<T> {
    try {
      // Build query based on whether clientId is provided
      const query = clientId ? { _id: id, clientId } : { _id: id };

      const document = await this.model
        .findOneAndUpdate(query, updateDto, { new: true })
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
   * Delete a document by ID for a specific client
   */
  async delete(id: string, clientId: string): Promise<T> {
    try {
      // Build query based on whether clientId is provided
      const query = clientId ? { _id: id, clientId } : { _id: id };

      const document = await this.model.findOneAndDelete(query).exec();

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
   * Count documents for a specific client
   */
  async count(filter: FilterQuery<T>, clientId: string): Promise<number> {
    // If clientId is provided, add it to filter for client isolation
    const clientFilter = clientId ? { ...filter, clientId } : filter;

    try {
      return await this.model.countDocuments(clientFilter).exec();
    } catch (error) {
      this.logger.error(`Error in count: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Perform aggregation for a specific client
   */
  async aggregate(pipeline: PipelineStage[], clientId: string): Promise<any[]> {
    try {
      // Only add clientId match stage if clientId is provided
      const clientPipeline = clientId
        ? [{ $match: { clientId } }, ...pipeline]
        : pipeline;

      return await this.model.aggregate(clientPipeline).exec();
    } catch (error) {
      this.logger.error(`Error in aggregate: ${error.message}`, error.stack);
      throw error;
    }
  }
}
