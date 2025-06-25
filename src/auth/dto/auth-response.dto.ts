import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../schema/user.schema'; // Import UserRole for enum type

export class AuthResponseDto {
  @ApiProperty({ description: 'User details' })
  user: {
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
    organizationId?: string; // Added organizationId
  };

  @ApiProperty({ description: 'JWT access token' })
  access_token: string;
}
