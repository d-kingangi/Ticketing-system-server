import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsInt,
    Min,
    IsMongoId,
} from 'class-validator';
import { ProductType } from '../interfaces/product.interfaces';
import { SupportedCurrency } from 'src/shared/enum/supported-currency.enum'; 

export class FindAllProductsQueryDto {
    @ApiPropertyOptional({ description: 'Page number for pagination.', default: 1, type: Number })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Number of items per page.', default: 10, type: Number })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Field to sort by.', example: 'name' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'Sort direction.', enum: ['asc', 'desc'], example: 'desc' })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortDirection?: 'asc' | 'desc' = 'desc';

    @ApiPropertyOptional({ description: 'Search term to filter by name or SKU.', example: 'T-Shirt' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by product category ID.', example: '654a3b2c1d0e9f8a7b6c5d4e' })
    @IsOptional()
    @IsMongoId()
    productCategoryId?: string;

    @ApiPropertyOptional({ description: 'Filter by product type.', enum: ProductType, example: ProductType.VARIABLE })
    @IsOptional()
    @IsEnum(ProductType)
    productType?: ProductType;

    @ApiPropertyOptional({ description: 'Filter by currency.', enum: SupportedCurrency, example: SupportedCurrency.KES })
    @IsOptional()
    @IsEnum(SupportedCurrency)
    currency?: SupportedCurrency;

    @ApiPropertyOptional({ description: 'Filter by active status.', type: Boolean, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Filter for products that are currently on sale.', type: Boolean, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    onSale?: boolean;

    @ApiPropertyOptional({ description: 'Include soft-deleted products in the result.', type: Boolean, default: false })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeDeleted?: boolean = false;
}
