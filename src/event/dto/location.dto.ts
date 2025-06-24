import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    IsNumber,
    ArrayMinSize,
    ArrayMaxSize,
} from 'class-validator';

export class LocationDto {
    @ApiProperty({ description: 'Name of the event venue', example: 'Grand Convention Center' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Address of the event venue', example: '123 Main St' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ description: 'City where the event is located', example: 'Metropolis' })
    @IsString()
    @IsNotEmpty()
    city: string;

    @ApiPropertyOptional({
        description: 'Geographic coordinates of the location [longitude, latitude]',
        example: [-74.0060, 40.7128],
        type: [Number],
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber({}, { each: true }) // Ensures each element in the array is a number
    coordinates?: [number, number];
}
