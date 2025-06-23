// src/database/database.module.ts
import { Module, OnApplicationShutdown, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const uri = configService.get<string>('MONGODB_URI');
        const maxConnectionAttempts =
          configService.get<number>('MONGODB_MAX_CONNECTION_ATTEMPTS') || 5;
        const reconnectInterval =
          configService.get<number>('MONGODB_RECONNECT_INTERVAL') || 5000;

        return {
          uri,
          // Using updated connection options compatible with newer MongoDB drivers
          maxPoolSize: 10, // Instead of poolSize
          retryAttempts: maxConnectionAttempts,
          retryDelay: reconnectInterval,
          // For production, we may want to disable automatic index creation
          autoIndex: process.env.NODE_ENV !== 'production',

          // Custom connection options
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log('MongoDB connection established successfully');
            });
            connection.on('error', (error) => {
              logger.error(
                `MongoDB connection error: ${error.message}`,
                error.stack,
              );
            });
            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });
            connection.on('reconnected', () => {
              logger.log('MongoDB reconnected');
            });

            // Return the modified connection
            return connection;
          },
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  // Ensure proper database disconnection when application shuts down
  async onApplicationShutdown() {
    try {
      const connection = this.moduleRef.get<Connection>(getConnectionToken());
      if (connection) {
        this.logger.log('Closing MongoDB connection...');
        await connection.close();
        this.logger.log('MongoDB connection closed');
      }
    } catch (error) {
      this.logger.error(
        `Error while closing MongoDB connection: ${error.message}`,
        error.stack,
      );
    }
  }
}
