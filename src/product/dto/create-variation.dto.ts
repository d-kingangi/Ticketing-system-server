import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    Min,
    ValidateNested,
    IsArray,
    ArrayMinSize,
    IsUrl,
} from 'class-validator';
import { CreateVariationAttributeDto } from './create-variation-attribute.dto';

/**
 * I've extracted the CreateVariationDto to its own file.
 * This DTO represents a single, sellable product variation and validates its nested attributes.
 */
export class CreateVariationDto {
    @ApiProperty({ type: [CreateVariationAttributeDto], description: 'Attributes that define this variation' })
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => CreateVariationAttributeDto)
    attributes: CreateVariationAttributeDto[];

    @ApiProperty({ example: 'TSHIRT-RED-M', description: 'Unique SKU for this variation' })
    @IsString()
    @IsNotEmpty()
    sku: string;

    @ApiProperty({ example: 29.99, description: 'Price of this variation' })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 12.5, description: 'Cost of this variation' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    cost?: number;

    @ApiProperty({ example: 100, description: 'Stock quantity for this variation' })
    @IsNumber()
    @Min(0)
    quantity: number;

    @ApiPropertyOptional({ example: 'https://example.com/images/tshirt-red-m.jpg', description: 'Image URL for this variation' })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;
}
