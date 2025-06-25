// roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../schema/user.schema';
import { Roles } from '../decorators/roles.decorator'; // Corrected import path for Roles decorator

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (endpoint is public or handled by other guards)
    if (!requiredRoles) {
      return true;
    }

    // Get the user object from the request (populated by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Ensure user object and user.roles array exist
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      // This typically means JwtAuthGuard failed or wasn't applied, or token is invalid.
      // JwtAuthGuard should throw UnauthorizedException before this.
      throw new ForbiddenException('Authentication required or user roles not found');
    }

    // Check if the user has at least one of the required roles
    const hasRequiredRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
