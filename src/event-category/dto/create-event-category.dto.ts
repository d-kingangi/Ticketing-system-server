import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    MinLength,
    IsUrl, // Added MinLength for potential name validation
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Import Swagger decorators

export class CreateEventCategoryDto {
    @ApiProperty({
        description: 'The name of the event category.',
        example: 'Concert',
        minLength: 3, // Example: enforce a minimum length for the name
    })
    @IsNotEmpty() // Ensures the name is not empty
    @IsString() // Ensures the name is a string
    @MinLength(3) // Example: minimum length for category name
    name: string;

    @ApiPropertyOptional({
        description: 'A brief description of the event category.',
        example: 'Live music performances and shows.',
    })
    @IsOptional() // Marks the field as optional
    @IsString() // Ensures the description is a string if provided
    description?: string;

    @ApiPropertyOptional({
        description: 'URL for the category icon/image.',
        example: 'https://example.com/icons/concert.png',
    })
    @IsOptional()
    @IsString()
    @IsUrl({}, { message: 'iconUrl must be a valid URL.' })
    iconUrl?: string;

    @ApiPropertyOptional({
        description: 'Indicates whether the event category is active. Defaults to true.',
        example: true,
        default: true,
    })
    @IsOptional() // Marks the field as optional
    @IsBoolean() // Ensures the value is a boolean if provided
    isActive?: boolean = true; // Default value set to true
}
