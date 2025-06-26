import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../schema/user.schema'; // Import UserRole for enum type

/**
 * DTO representing the structure of the authenticated user's details
 * returned in the authentication response.
 */
export class UserAuthResponseDto {
  @ApiProperty({ description: 'User ID' })
  _id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;

  @ApiProperty({ description: 'User full name (virtual property)' })
  fullName: string;

  @ApiProperty({ description: 'User roles', enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty({ description: 'Whether the user email is verified' })
  isVerified: boolean;

  @ApiPropertyOptional({ description: 'The ID of the organization the user belongs to (if any)' })
  organizationId?: string;
}

/**
 * DTO representing the full authentication response, including user details and JWT token.
 */
export class AuthResponseDto {
  @ApiProperty({ description: 'User details', type: UserAuthResponseDto })
  user: UserAuthResponseDto;

  @ApiProperty({ description: 'JWT access token' })
  access_token: string;
}
