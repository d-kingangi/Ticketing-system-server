
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty } from 'class-validator';

/**
 * I've moved the CreateVariationOptionDto to its own file.
 * This DTO defines the available options for the UI, like { name: 'Size', values: ['S', 'M', 'L'] }.
 */
export class CreateVariationOptionDto {
    @ApiProperty({ example: 'Size', description: 'Name of the variation option' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ type: [String], example: ['S', 'M', 'L'], description: 'List of available values for the option' })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    values: string[];
}
