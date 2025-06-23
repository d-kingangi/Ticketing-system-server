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
    const user = request.user;
    const resourceId = request.params.id;
    const resourceOwnerId = request.params.userId || request.body.userId;

    // Admin can access everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Doctor, Nurse or Receptionist can access all patient data within their client
    if (
      [UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST].includes(
        user.role,
      )
    ) {
      // Check if the resource belongs to the same client
      // This would need to be implemented based on your resource structure
      return true;
    }

    // Patients can only access their own data
    if (user.role === UserRole.PATIENT) {
      // User is trying to access their own resource
      if (resourceOwnerId && resourceOwnerId !== user._id.toString()) {
        this.logger.warn(
          `Patient ${user._id} attempted to access data owned by ${resourceOwnerId}`,
        );
        throw new ForbiddenException('You can only access your own data');
      }
    }

    return true;
  }
}
