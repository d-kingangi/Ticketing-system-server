import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../schema/user.schema'; // Import UserDocument for type safety

/**
 * Decorator to easily access the authenticated user's organization ID.
 * This assumes the `JwtAuthGuard` has already populated `request.user`.
 *
 * @example
 * // Get organization ID
 * @GetOrganizationId() organizationId: string
 */
export const GetOrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDocument; // Cast to UserDocument

    // Return the organizationId from the authenticated user object
    return user?.organizationId?.toString(); // Convert ObjectId to string
  },
);
