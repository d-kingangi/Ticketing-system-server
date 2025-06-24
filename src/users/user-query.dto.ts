// src/users/dto/user-query.dto.ts
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsMongoId,
  IsArray, // Import IsArray for validating array types
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from 'src/auth/schema/user.schema';

export class UserQueryDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsArray() // Indicate that 'roles' is an array
  @IsEnum(UserRole, { each: true }) // Validate each item in the array against UserRole enum
  roles?: UserRole[]; // Changed from 'role' to 'roles' (array of UserRole)

  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeDeleted?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @Transform(({ value }) => (value === 'asc' ? 1 : -1))
  sortDirection?: number = -1;
}
