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
    Validate,
    IsDateString,
} from 'class-validator';
import { CreateVariationAttributeDto } from './create-variation-attribute.dto';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isLessThan', async: false })
export class IsLessThanConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        const [relatedPropertyName] = args.constraints;
        const relatedValue = (args.object as any)[relatedPropertyName];
        return typeof value === 'number' && typeof relatedValue === 'number' && value < relatedValue;
    }

    defaultMessage(args: ValidationArguments) {
        const [relatedPropertyName] = args.constraints;
        return `$property must be less than ${relatedPropertyName}`;
    }
}

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

    @ApiPropertyOptional({ description: 'The sale price of the variation. Must be less than the regular price.', example: 19.99 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Validate(IsLessThanConstraint, ['price']) // Ensures salePrice < price
    salePrice?: number;

    @ApiPropertyOptional({ description: 'The date when the sale price becomes active (ISO 8601 format).', example: '2024-07-01T00:00:00Z' })
    @IsOptional()
    @IsDateString()
    saleStartDate?: Date;

    @ApiPropertyOptional({ description: 'The date when the sale price expires (ISO 8601 format).', example: '2024-07-31T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    saleEndDate?: Date;
}
