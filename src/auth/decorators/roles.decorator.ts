import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../schema/user.schema';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
