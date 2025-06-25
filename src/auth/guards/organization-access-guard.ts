// src/auth/guards/client-access.guard.ts
// This guard ensures users can only access data from their own client
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../schema/user.schema';
import { UserDocument } from '../schema/user.schema'; // Import UserDocument for type safety

@Injectable()
export class OrganizationAccessGuard implements CanActivate { // Renamed class
  private readonly logger = new Logger(OrganizationAccessGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserDocument; // User object populated by JwtAuthGuard

    // Extract the organizationId from the request.
    // This could come from a route parameter (e.g., /events/:organizationId),
    // a query parameter, or a request body.
    // The controller methods should explicitly pass the relevant ID.
    // For simplicity here, we'll assume it's passed via a custom request property
    // or a route param named 'organizationId'.
    // IMPORTANT: Controllers must ensure the target organizationId is available in request.params or request.body
    // or passed as an argument to the service method.
    const targetOrganizationId =
      request.params.organizationId ||
      request.query.organizationId ||
      request.body.organizationId;


      // Admin role can bypass organization checks
    if (user.roles.includes(UserRole.ADMIN)) {
      return true;
    }

    // If the user is an AGENT, they must be associated with an organization.
    // If the resource has a target organization ID, it must match the user's organization ID.
    if (user.roles.includes(UserRole.AGENT)) {
      if (!user.organizationId) {
        throw new ForbiddenException('Agent is not associated with an organization.');
      }

      // If a specific organization's resource is being accessed, ensure it matches the agent's organization.
      if (targetOrganizationId && user.organizationId.toString() !== targetOrganizationId.toString()) {
        this.logger.warn(
          `Agent ${user._id} from org ${user.organizationId} attempted to access data from target organization ${targetOrganizationId}`,
        );
        throw new ForbiddenException(
          'You can only access data from your own organization.',
        );
      }
      // If no specific targetOrganizationId is provided, and the agent is trying to access
      // a list of resources, the service layer should filter by the agent's organizationId.
      return true;
    }

    // For CUSTOMER role, they typically don't have an organizationId in this context
    // and their access is usually limited to their own data (e.g., their own purchases/tickets).
    // This guard might not be strictly necessary for CUSTOMERs if their data access is
    // always filtered by their userId in the service layer.
    // However, if a CUSTOMER tries to access an organization-specific resource, it should be forbidden.
    if (user.roles.includes(UserRole.CUSTOMER)) {
      if (targetOrganizationId) {
        throw new ForbiddenException('Customers cannot access organization-specific resources.');
      }
      return true; // Allow if no organization-specific resource is targeted
    }


     // Fallback for any other unhandled roles or scenarios
    throw new ForbiddenException('Insufficient permissions or invalid access attempt.');
  }
}