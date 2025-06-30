import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsEnum,
    IsNumber,
    Min,
    ValidateNested,
    IsArray,
    ArrayNotEmpty,
    ArrayMinSize,
    ValidateIf,
    IsMongoId,
    IsUrl,
    Validate,
    IsDateString,
} from 'class-validator';
import { ProductType } from '../interfaces/product.interfaces';
import { CreateVariationOptionDto } from './create-variation-option.dto';
import { CreateVariationDto } from './create-variation.dto';
import { IsLessThanConstraint } from './create-variation.dto';


export class CreateProductDto {
    @ApiProperty({
        description: 'The name of the product.',
        example: 'Official Tour T-Shirt',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        description: 'A detailed description of the product.',
        example: 'High-quality cotton T-shirt from the official tour.',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'The ID of the product category this product belongs to.',
        example: '654a3b2c1d0e9f8a7b6c5d4e',
    })
    @IsMongoId()
    productCategoryId: string;

    @ApiProperty({
        enum: ProductType,
        description: "The type of product: 'simple' or 'variable'.",
        example: ProductType.SIMPLE,
    })
    @IsEnum(ProductType)
    productType: ProductType;

    // --- Fields for SIMPLE products ---
    // I'm using @ValidateIf to make these fields required only when productType is 'simple'.
    @ApiPropertyOptional({ description: 'SKU for a simple product.', example: 'COKE-330ML' })
    @ValidateIf(o => o.productType === ProductType.SIMPLE)
    @IsNotEmpty()
    @IsString()
    sku?: string;

    @ApiPropertyOptional({ description: 'Price for a simple product.', example: 5.99 })
    @ValidateIf(o => o.productType === ProductType.SIMPLE)
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ description: 'Stock quantity for a simple product.', example: 200 })
    @ValidateIf(o => o.productType === ProductType.SIMPLE)
    @IsNumber()
    @Min(0)
    quantity?: number;

    // --- Fields for VARIABLE products ---
    // These fields are required only when productType is 'variable'.
    @ApiPropertyOptional({
        type: [CreateVariationOptionDto],
        description: 'Defines the selectable options for a variable product (e.g., Color, Size).',
    })
    @ValidateIf(o => o.productType === ProductType.VARIABLE)
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateVariationOptionDto)
    variationOptions?: CreateVariationOptionDto[];

    @ApiPropertyOptional({
        type: [CreateVariationDto],
        description: 'The list of all specific variations of the product.',
    })
    @ValidateIf(o => o.productType === ProductType.VARIABLE)
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CreateVariationDto)
    variations?: CreateVariationDto[];

    // --- Common Optional Fields ---
    @ApiPropertyOptional({ description: 'Cost of a simple product.', example: 2.5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    cost?: number;

    @ApiPropertyOptional({ description: 'Image URL for a simple product.', example: 'https://example.com/images/coke.jpg' })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @ApiPropertyOptional({ description: 'The sale price of a simple product. Must be less than the regular price.', example: 3.99 })
    @ValidateIf(o => o.productType === ProductType.SIMPLE)
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Validate(IsLessThanConstraint, ['price']) // Ensures salePrice < price
    salePrice?: number;

    @ApiPropertyOptional({ description: 'The date when the sale price becomes active (ISO 8601 format).', example: '2024-07-01T00:00:00Z' })
    @ValidateIf(o => o.productType === ProductType.SIMPLE)
    @IsOptional()
    @IsDateString()
    saleStartDate?: Date;

    @ApiPropertyOptional({ description: 'The date when the sale price expires (ISO 8601 format).', example: '2024-07-31T23:59:59Z' })
    @ValidateIf(o => o.productType === ProductType.SIMPLE)
    @IsOptional()
    @IsDateString()
    saleEndDate?: Date;

    @ApiPropertyOptional({ description: 'Whether the product is active and can be sold.', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiPropertyOptional({ description: 'Whether to track stock for this product.', default: true })
    @IsOptional()
    @IsBoolean()
    isTrackable?: boolean = true;
}
