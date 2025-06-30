import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '../interfaces/product.interfaces';

// --- Start of change: I've created nested response DTOs to match the entity structure.

class VariationAttributeResponseDto {
    @ApiProperty({ example: 'Color' })
    name: string;

    @ApiProperty({ example: 'Red' })
    value: string;
}

class VariationOptionResponseDto {
    @ApiProperty({ example: 'Size' })
    name: string;

    @ApiProperty({ type: [String], example: ['S', 'M', 'L'] })
    values: string[];
}

class VariationResponseDto {
    @ApiProperty({ description: 'Unique identifier for the variation', example: '655b65a1e8a3d4c5e6f7g8h9' })
    id: string;

    @ApiProperty({ type: [VariationAttributeResponseDto] })
    attributes: VariationAttributeResponseDto[];

    @ApiProperty({ example: 'TSHIRT-RED-M' })
    sku: string;

    @ApiProperty({ example: 29.99 })
    price: number;

    @ApiPropertyOptional({ example: 12.5 })
    cost?: number;

    @ApiProperty({ example: 100 })
    quantity: number;

    @ApiPropertyOptional({ example: 'https://example.com/images/tshirt-red-m.jpg' })
    imageUrl?: string;
}

// --- End of change

export class ProductResponseDto {
    @ApiProperty({ description: 'Unique identifier for the product', example: '655b65a1e8a3d4c5e6f7g8h8' })
    id: string;

    @ApiProperty({ enum: ProductType, example: ProductType.VARIABLE })
    productType: ProductType;

    @ApiProperty({ example: 'Official Tour T-Shirt' })
    name: string;

    @ApiPropertyOptional({ example: 'High-quality cotton T-shirt from the official tour.' })
    description?: string;

    @ApiProperty({ example: '654a3b2c1d0e9f8a7b6c5d4e' })
    productCategoryId: string;

    @ApiProperty({ example: '654a3b2c1d0e9f8a7b6c5d4f' })
    organizationId: string;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: true })
    isTrackable: boolean;

    // --- Simple Product Fields ---
    @ApiPropertyOptional({ example: 'COKE-330ML' })
    sku?: string;

    @ApiPropertyOptional({ example: 5.99 })
    price?: number;

    @ApiPropertyOptional({ example: 2.5 })
    cost?: number;

    @ApiPropertyOptional({ example: 200 })
    quantity?: number;

    @ApiPropertyOptional({ example: 'https://example.com/images/coke.jpg' })
    imageUrl?: string;

    // --- Variable Product Fields ---
    @ApiPropertyOptional({ type: [VariationOptionResponseDto] })
    variationOptions?: VariationOptionResponseDto[];

    @ApiPropertyOptional({ type: [VariationResponseDto] })
    variations?: VariationResponseDto[];

    @ApiProperty({ example: '2023-11-20T12:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2023-11-20T12:30:00.000Z' })
    updatedAt: Date;
}
