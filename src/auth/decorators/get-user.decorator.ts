// src/auth/decorators/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to easily access the authenticated user
 * @example
 * // Get whole user object
 * @GetUser() user: UserDocument
 *
 * // Get specific user property
 * @GetUser('_id') userId: string
 */
export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      // If specific user data is requested
      return user?.[data];
    }

    // Return the whole user object by default
    return user;
  },
);
