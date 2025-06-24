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
  organizer: string;

  @ApiProperty()
  category: string;

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
