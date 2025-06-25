import { PartialType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsBoolean,
  IsArray, // Import IsArray for validating array types
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Import Swagger decorators
import { UserRole } from '../../auth/schema/user.schema'; // Corrected import path for UserRole
import { CreateUserDto } from './create-user.dto'; // Import CreateUserDto

// UpdateUserDto inherits all properties from CreateUserDto and makes them optional.
// This is a common and clean way to handle updates where not all fields are required.
export class UpdateUserDto extends PartialType(CreateUserDto) {
  /**
   * The first name of the user.
   */
  @ApiPropertyOptional({ description: 'The first name of the user.', example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string;

  /**
   * The last name of the user.
   */
  @ApiPropertyOptional({ description: 'The last name of the user.', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  /**
   * The email address of the user. Must be unique.
   */
  @ApiPropertyOptional({ description: 'The email address of the user. Must be unique.', example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * The password for the user account. Must be at least 6 characters long.
   */
  @ApiPropertyOptional({ description: 'The password for the user account. Must be at least 6 characters long.', example: 'newpassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  /**
   * An array of roles assigned to the user.
   */
  @ApiPropertyOptional({
    description: 'An array of roles assigned to the user.',
    enum: UserRole,
    isArray: true,
    example: [UserRole.CUSTOMER, UserRole.AGENT],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  /**
   * Indicates if the user account is active.
   */
  @ApiPropertyOptional({ description: 'Indicates if the user account is active.', example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * The phone number of the user.
   */
  @ApiPropertyOptional({ description: 'The phone number of the user.', example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  /**
   * URL to the user's profile picture.
   */
  @ApiPropertyOptional({ description: 'URL to the user\'s profile picture.', example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  profileUrl?: string;

  /**
   * Indicates if the user's email is verified.
   */
  @ApiPropertyOptional({ description: 'Indicates if the user\'s email is verified.', example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  /**
   * Custom settings for the user.
   */
  @ApiPropertyOptional({ description: 'Custom settings for the user.', example: { theme: 'dark', notifications: true } })
  @IsOptional()
  settings?: Record<string, any>;
}
