import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for representing an Event Category in API responses.
 * This DTO is used to shape the data returned to clients, ensuring
 * consistency and hiding any internal or sensitive fields.
 */
export class EventCategoryResponseDto {
    /**
     * The unique identifier of the event category.
     */
    @ApiProperty({ description: 'The unique identifier of the event category.', example: '654a3b2c1d0e9f8a7b6c5d4e' })
    id: string;

    /**
     * The name of the event category.
     */
    @ApiProperty({ description: 'The name of the event category.', example: 'Concert' })
    name: string;

    /**
     * A brief description of the event category.
     */
    @ApiPropertyOptional({ description: 'A brief description of the event category.', example: 'Live music performances and shows.' })
    description?: string;

    @ApiPropertyOptional({
        description: 'URL for the category icon/image.',
        example: 'https://example.com/icons/concert.png',
    })
    iconUrl?: string;
    
    /**
     * Indicates whether the event category is active.
     */
    @ApiProperty({ description: 'Indicates whether the event category is active.', example: true })
    isActive: boolean;

    /**
     * The timestamp when the event category was created.
     */
    @ApiProperty({ description: 'The timestamp when the event category was created.', example: '2023-10-27T10:00:00.000Z' })
    createdAt: Date;

    /**
     * The timestamp when the event category was last updated.
     */
    @ApiProperty({ description: 'The timestamp when the event category was last updated.', example: '2023-10-27T11:30:00.000Z' })
    updatedAt: Date;
}