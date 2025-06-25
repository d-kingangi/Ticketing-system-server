import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../auth/schema/user.schema'; // Corrected import path for UserRole

export class UserResponseDto {
  @ApiProperty({ description: 'The unique identifier of the user.' })
  id: string;

  @ApiProperty({ description: 'The first name of the user.' })
  firstName: string;

  @ApiProperty({ description: 'The last name of the user.' })
  lastName: string;

  @ApiProperty({ description: 'The full name of the user (virtual property).', example: 'John Doe' })
  fullName: string; // Virtual property from schema

  @ApiProperty({ description: 'The email address of the user.' })
  email: string;

  @ApiPropertyOptional({ description: 'The phone number of the user.' })
  phone?: string;

  @ApiPropertyOptional({ description: 'URL to the user\'s profile picture.' })
  profileUrl?: string;

  @ApiProperty({ description: 'An array of roles assigned to the user.', enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty({ description: 'Indicates if the user account is active.' })
  isActive: boolean;

  @ApiProperty({ description: 'Indicates if the user\'s email is verified.' })
  isVerified: boolean;

  @ApiProperty({ description: 'Indicates if the user account is soft-deleted.' })
  isDeleted: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when the user account was soft-deleted.' })
  deletedAt?: Date;

  @ApiPropertyOptional({ description: 'Timestamp of the user\'s last login.' })
  lastLoginAt?: Date;

  @ApiPropertyOptional({ description: 'Custom settings for the user.' })
  settings?: Record<string, any>;

  @ApiProperty({ description: 'Timestamp of when the user account was created.' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of when the user account was last updated.' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Optionaly pass the users organizationId.' })
  organizationId?: Date;

}
