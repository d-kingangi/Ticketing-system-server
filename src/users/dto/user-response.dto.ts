// src/users/dto/user-response.dto.ts

import { UserRole } from 'src/auth/schema/user.schema';

export class UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  clientId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
