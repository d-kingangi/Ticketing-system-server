import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
  IsBoolean,
  IsArray, // Import IsArray for validating array types
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Import Swagger decorators
import { UserRole } from '../../auth/schema/user.schema'; // Corrected import path for UserRole

export class CreateUserDto {
  /**
   * The first name of the user.
   */
  @ApiProperty({ description: 'The first name of the user.', example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string; // Changed from 'fullName' to 'firstName' to match the User schema's individual name fields.

  /**
   * The last name of the user.
   */
  @ApiProperty({ description: 'The last name of the user.', example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string; // Added 'lastName' to match the User schema.

  /**
   * The email address of the user. Must be unique.
   */
  @ApiProperty({ description: 'The email address of the user. Must be unique.', example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  /**
   * The password for the user account. Must be at least 6 characters long.
   */
  @ApiProperty({ description: 'The password for the user account. Must be at least 6 characters long.', example: 'password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  /**
   * An array of roles assigned to the user. Defaults to [UserRole.CUSTOMER].
   * This allows a user to have multiple roles (e.g., an admin who is also a customer).
   */
  @ApiPropertyOptional({
    description: 'An array of roles assigned to the user. Defaults to [UserRole.CUSTOMER].',
    enum: UserRole,
    isArray: true, // Indicates that this property is an array for Swagger documentation.
    example: [UserRole.CUSTOMER],
  })
  @IsOptional()
  @IsArray() // Validator to ensure the field is an array.
  @IsEnum(UserRole, { each: true }) // Validator to ensure each item in the array is a valid UserRole enum value.
  roles?: UserRole[] = [UserRole.CUSTOMER]; // Changed from 'role' to 'roles' (array) to match the User schema. Default value set.

  /**
   * Indicates if the user account is active. Defaults to true.
   */
  @ApiPropertyOptional({ description: 'Indicates if the user account is active. Defaults to true.', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

}
