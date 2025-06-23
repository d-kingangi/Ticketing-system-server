import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * A generic DTO for paginated API responses.
 * @template T The type of the data items in the paginated list.
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true, description: 'Array of data items for the current page.' })
  data: T[];

  @ApiProperty({ example: 100, description: 'Total number of items available.' })
  @Type(() => Number)
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number.' })
  @Type(() => Number)
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Total number of pages available.' })
  @Type(() => Number)
  totalPages: number;

  constructor(partial: Partial<PaginatedResponseDto<T>>) {
    Object.assign(this, partial);
  }
}