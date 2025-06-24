import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsMongoId, IsDateString } from 'class-validator';
import { DiscountType, SupportedCurrencies } from '../entities/ticket-type.entity';

export class FindAllTicketTypesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by ticket type name (case-insensitive search).' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by event ID.' })
  @IsOptional()
  @IsMongoId()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Filter by organization Id.' })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by currency.' })
  @IsOptional()
  @IsEnum(SupportedCurrencies)
  currency?: SupportedCurrencies;

  @ApiPropertyOptional({ description: 'Filter by active status.', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by hidden status.', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({ description: 'Include soft-deleted ticket types in the result.', type: Boolean, default: false })
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

  @ApiPropertyOptional({ description: 'Filter by sales start date (ISO 8601 format) - greater than or equal to.', example: '2023-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  salesStartDateGte?: Date;

  @ApiPropertyOptional({ description: 'Filter by sales end date (ISO 8601 format) - less than or equal to.', example: '2023-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  salesEndDateLte?: Date;
}
