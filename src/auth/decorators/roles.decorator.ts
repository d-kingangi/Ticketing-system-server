import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../schema/user.schema'; // Import UserRole enum

/**
 * Decorator to specify required roles for an endpoint.
 * Used with `RolesGuard` for authorization.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
/**
 * Example usage:
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 * @Get('admin')
 * async getAdminData() {
 *   // Only accessible by users with ADMIN or MODERATOR roles
 * }
 */