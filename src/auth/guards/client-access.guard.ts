import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

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

@Injectable()
export class ClientAccessGuard implements CanActivate {
  private readonly logger = new Logger(ClientAccessGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestedClientId =
      request.params.clientId ||
      request.query.clientId ||
      request.body.clientId;

    // Super admin can access everything
    if (user.role === 'admin' && !user.clientId) {
      return true;
    }

    // For client-specific resources
    if (requestedClientId && user.clientId) {
      // Check if user's client matches the requested client
      const hasAccess =
        user.clientId.toString() === requestedClientId.toString();

      if (!hasAccess) {
        this.logger.warn(
          `User ${user._id} attempted to access data from client ${requestedClientId}`,
        );
        throw new ForbiddenException(
          'You can only access data from your own client',
        );
      }
    }

    return true;
  }
}
