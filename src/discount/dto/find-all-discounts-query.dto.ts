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
} from 'class-validator';
import { DiscountScope } from '../enum/discount-scope.enum';

/**
 * DTO for querying discounts with pagination, sorting, and filtering.
 * This DTO is used to define the structure of query parameters received
 * when fetching a list of discounts.
 */
export class FindAllDiscountsQueryDto {
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

  @ApiPropertyOptional({
    description: 'Filter by discount scope.',
    enum: DiscountScope,
    example: DiscountScope.PRODUCT,
  })
  @IsOptional()
  @IsEnum(DiscountScope)
  scope?: DiscountScope;

  @ApiPropertyOptional({ description: 'Filter by event ID.', example: '60c72b2f9b1d4c001c8e4a02' })
  @IsOptional()
  @IsMongoId()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Filter by discount code (case-insensitive search).', example: 'SUMMER2024' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Filter by active status.', type: Boolean, example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Include soft-deleted discounts in the result.', type: Boolean, default: false, example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean = false;
}
