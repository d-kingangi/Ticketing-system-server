import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Simplified middleware that doesn't depend on JwtService or ClientModel
 * This prevents circular dependencies and missing providers
 */
@Injectable()
export class ClientContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ClientContextMiddleware.name);

  constructor() {} // No dependencies!

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      try {
        // Extract token from Authorization header (Bearer token)
        const token = authHeader.split(' ')[1];

        // Store the raw token in the request for later use
        // The actual validation and extraction will happen in guards/interceptors
        req['token'] = token;

        // Note: We're not validating the token here to avoid circular dependencies
        // Token validation should happen in guards instead
      } catch (error) {
        this.logger.warn(
          `Error processing authorization header: ${error.message}`,
        );
      }
    }

    next();
  }
}
