import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsUrl,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '../entities/event.entity'; // Assuming event.entity.ts is in the same directory
import { LocationDto } from './location.dto'; // Import the newly created LocationDto

export class CreateEventDto {
  @ApiProperty({
    description: 'ID of the organization hosting the event',
    example: '60c72b2f9b1d4c001c8e4a01',
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'ID of the organization hosting the event',
    example: '60c72b2f9b1d4c001c8e4a01',
  })
  @IsMongoId()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Title of the event', example: 'Annual Tech Conference' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the event',
    example: 'A comprehensive conference covering the latest in technology.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Name of the event organizer', example: 'Tech Innovators Inc.' })
  @IsString()
  @IsNotEmpty()
  organizer: string;

  @ApiProperty({ description: 'Category id of the event', example: 'Technology' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Location details of the event' })
  @Type(() => LocationDto) // Important for nested DTOs to enable validation
  @ValidateNested() // Ensures the nested object is also validated
  @IsNotEmpty()
  location: LocationDto;

  @ApiProperty({
    description: 'Start date and time of the event (ISO 8601 format)',
    example: '2023-10-26T09:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDateTime: Date;

  @ApiProperty({
    description: 'End date and time of the event (ISO 8601 format)',
    example: '2023-10-28T17:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDateTime: Date;

  @ApiProperty({
    description: 'URL of the featured image for the event',
    example: 'https://example.com/images/tech-conf.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  featuredImage: string;

  @ApiPropertyOptional({
    description: 'URLs of additional gallery images for the event',
    example: ['https://example.com/images/gallery1.jpg', 'https://example.com/images/gallery2.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true }) // Ensures each element in the array is a valid URL
  galleryImages?: string[];

  @ApiPropertyOptional({
    enum: EventStatus,
    description: 'Current status of the event',
    example: EventStatus.DRAFT,
    default: EventStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Whether the event is publicly visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of attendees allowed for the event',
    example: 500,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;
}
