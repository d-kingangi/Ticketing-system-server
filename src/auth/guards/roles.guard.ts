import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../schema/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the user object from the request (populated by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Ensure user object and user.roles array exist
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('Authentication required or user roles not found');
    }

    const hasRequiredRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
