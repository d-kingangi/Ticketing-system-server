// src/auth/decorators/get-client.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to easily access the client context
 * @example
 * // Get client ID
 * @GetClient() clientId: string
 *
 * // Get specific client property
 * @GetClient('name') clientName: string
 */
export const GetClient = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (data) {
      // If specific client data is requested
      return request.clientContext?.[data];
    }

    // Return clientId by default
    return request.clientId;
  },
);
