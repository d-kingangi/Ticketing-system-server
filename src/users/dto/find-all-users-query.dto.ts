import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  IsMongoId,
  IsDateString,
  IsArray,
} from 'class-validator';
import { UserRole } from '../../auth/schema/user.schema'; // Corrected import path for UserRole

export class FindAllUsersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by first name (partial match, case-insensitive).' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Filter by last name (partial match, case-insensitive).' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Filter by email (partial match, case-insensitive).' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter by user roles. Can be a single role or a comma-separated list of roles.',
    enum: UserRole,
    isArray: true,
    example: [UserRole.CUSTOMER, UserRole.AGENT],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  // Transform comma-separated string to array if needed, or handle in service
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  roles?: UserRole[];

  @ApiPropertyOptional({ description: 'Filter by active status.', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by verified status.', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Include soft-deleted users in the result.', type: Boolean, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({ description: 'Page number for pagination.', default: 1, type: Number })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page.', default: 10, type: Number })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Field to sort by.', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction.', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by creation date (ISO 8601 format) - greater than or equal to.', example: '2023-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  createdAtGte?: Date;

  @ApiPropertyOptional({ description: 'Filter by creation date (ISO 8601 format) - less than or equal to.', example: '2023-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  createdAtLte?: Date;
}
