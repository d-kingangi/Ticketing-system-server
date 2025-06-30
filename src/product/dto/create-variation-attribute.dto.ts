import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * I've created this file to isolate the DTO for a single variation attribute.
 * This ensures structured and valid input for attributes like { name: 'Color', value: 'Red' }.
 */
export class CreateVariationAttributeDto {
    @ApiProperty({ example: 'Color', description: 'Name of the attribute' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Red', description: 'Value of the attribute' })
    @IsString()
    @IsNotEmpty()
    value: string;
}
