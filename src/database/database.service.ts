import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Document } from 'mongoose';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Get the raw MongoDB connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Check if the database connection is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Check if connection is ready
      if (this.connection.readyState !== 1) {
        this.logger.warn(
          `Database connection not ready. State: ${this.connection.readyState}`,
        );
        return false;
      }

      // Try simple admin command to verify connection is working
      await this.connection.db.admin().ping();
      return true;
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Create indices for a collection to improve query performance
   * Especially important for a medical system with potentially large datasets
   */
  async createIndices<T extends Document>(
    model: Model<T>,
    indices: { fields: Record<string, 1 | -1>; options?: any }[],
  ): Promise<void> {
    try {
      for (const index of indices) {
        await model.collection.createIndex(index.fields, index.options);
        this.logger.log(
          `Index created on ${model.collection.collectionName}: ${JSON.stringify(index.fields)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create indices: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Execute a raw MongoDB aggregation pipeline
   * Useful for complex reports and analytics
   */
  async aggregate(collectionName: string, pipeline: any[]): Promise<any[]> {
    try {
      return await this.connection.db
        .collection(collectionName)
        .aggregate(pipeline)
        .toArray();
    } catch (error) {
      this.logger.error(`Aggregation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a transaction session
   * Important for operations that need to be atomic
   */
  // async startTransaction() {
  //   const session = await this.connection.startSession();
  //   session.startTransaction();
  //   return session;
  // }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats() {
    try {
      return await this.connection.db.stats();
    } catch (error) {
      this.logger.error(
        `Failed to get database stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Multi-client specific: Get collection size by client
   * Useful for monitoring data usage per client
   */
  async getCollectionSizeByClient(collectionName: string): Promise<any[]> {
    try {
      return this.aggregate(collectionName, [
        {
          $group: {
            _id: '$clientId',
            count: { $sum: 1 },
            size: { $sum: { $bsonSize: '$ROOT' } },
          },
        },
        {
          $project: {
            clientId: '$_id',
            count: 1,
            sizeKB: { $divide: ['$size', 1024] },
          },
        },
        { $sort: { sizeKB: -1 } },
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to get collection size by client: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
