import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

/**
 * DTO for querying event categories with pagination, sorting, and filtering.
 * This DTO is used to define the structure of query parameters received
 * when fetching a list of event categories.
 */
export class FindAllEventCategoriesQueryDto {
  /**
   * Page number for pagination.
   */
  @ApiPropertyOptional({ description: 'Page number for pagination.', default: 1, type: Number })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10)) // Converts string to integer
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page.
   */
  @ApiPropertyOptional({ description: 'Number of items per page.', default: 10, type: Number })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10)) // Converts string to integer
  @IsInt()
  @Min(1)
  limit?: number = 10;

  /**
   * Field to sort by.
   */
  @ApiPropertyOptional({ description: 'Field to sort by.', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  /**
   * Sort direction.
   */
  @ApiPropertyOptional({ description: 'Sort direction.', enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';

  /**
   * Filter by active status.
   */
  @ApiPropertyOptional({ description: 'Filter by active status.', type: Boolean, example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Converts 'true'/'false' string to boolean
  @IsBoolean()
  isActive?: boolean;

  /**
   * Include soft-deleted categories in the result.
   */
  @ApiPropertyOptional({ description: 'Include soft-deleted categories in the result.', type: Boolean, default: false, example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Converts 'true'/'false' string to boolean
  @IsBoolean()
  includeDeleted?: boolean = false;
}
