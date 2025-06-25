import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsMongoId, IsDateString } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

export class FindAllTicketsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by ticket type ID.' })
  @IsOptional()
  @IsMongoId()
  ticketTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by event ID.' })
  @IsOptional()
  @IsMongoId()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Filter by organization ID.' })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by purchase ID.' })
  @IsOptional()
  @IsMongoId()
  purchaseId?: string;

  @ApiPropertyOptional({ description: 'Filter by owner ID.' })
  @IsOptional()
  @IsMongoId()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Filter by ticket status.' })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ description: 'Filter by ticket code (exact match).' })
  @IsOptional()
  @IsString()
  ticketCode?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted tickets in the result.', type: Boolean, default: false })
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
