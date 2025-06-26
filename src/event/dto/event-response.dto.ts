import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '../entities/event.entity';
import { LocationDto } from './location.dto';

export class EventResponseDto {
  @ApiProperty({ description: "The event's unique identifier." })
  id: string;

  @ApiProperty({ description: 'The ID of the user who created the event.' })
  userId: string;

  @ApiProperty({ description: 'The ID of the organization that owns the event.' })
  organizationId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  organizers: string[];

  @ApiProperty()
  categoryId: string;

  @ApiProperty({ type: LocationDto })
  location: LocationDto;

  @ApiProperty()
  startDateTime: Date;

  @ApiProperty()
  endDateTime: Date;

  @ApiProperty()
  featuredImage: string;

  @ApiPropertyOptional({ type: [String] })
  galleryImages?: string[];

  /**
   * Optional social media links for the event.
   * This is an object where keys are social media platform names (e.g., 'twitter', 'facebook')
   * and values are their corresponding URLs.
   */
  @ApiPropertyOptional({
    description: 'Optional social media links for the event (key-value pairs).',
    example: { twitter: 'https://twitter.com/event_handle', instagram: 'https://instagram.com/event_page' },
    type: 'object', // Specify type as object for Swagger
    additionalProperties: { type: 'string' }, // Indicate that properties can have string values
  })
  socialMediaLinks?: Record<string, string>; // New field to match the schema


  @ApiProperty({ enum: EventStatus })
  status: EventStatus;

  @ApiProperty()
  isPublic: boolean;

  @ApiPropertyOptional()
  maxAttendees?: number;

  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  updatedBy?: string;
}
