import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../schema/user.schema';

@Injectable()
export class OwnershipGuard implements CanActivate {
  private readonly logger = new Logger(OwnershipGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Authenticated user from JWT payload
    const resourceId = request.params.id; // ID of the resource being accessed/modified
    // This might be used if the resource ID is nested or passed differently
    const resourceOwnerId = request.params.userId || request.body.userId;

    // Admins have full access to all resources
    if (user.roles.includes(UserRole.ADMIN)) { // Check if user's roles include ADMIN
      return true;
    }

    // This guard currently allows them full access, but you might need to add
    // more specific logic here to check if the resource belongs to their client.
    if (user.roles.includes(UserRole.AGENT)) { // Check if user's roles include AGENT
      // Example: You might fetch the resource and check its clientId against user.clientId
      // For now, it broadly allows agents to access data, which might need refinement
      return true;
    }

    // CUSTOMERs can only access their own data.
    if (user.roles.includes(UserRole.CUSTOMER)) { // Check if user's roles include CUSTOMER
      // If a resourceOwnerId is provided (e.g., in the request body or params),
      // ensure it matches the authenticated user's ID.
      if (resourceOwnerId && resourceOwnerId !== user._id.toString()) {
        this.logger.warn(
          `Customer ${user._id} attempted to access data owned by ${resourceOwnerId}`,
        );
        throw new ForbiddenException('You can only access your own data');
      }
      // If the resource ID in the URL matches the authenticated user's ID, allow access.
      if (resourceId && resourceId === user._id.toString()) {
        return true;
      }
    }

    // If none of the above conditions are met, deny access.
    throw new ForbiddenException('You do not have permission to access this resource');
  }
}
