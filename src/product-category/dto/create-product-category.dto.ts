import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateProductCategoryDto {
    @ApiProperty({
        description: 'The name of the product category.',
        example: 'Beverages',
        minLength: 3,
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    name: string;

    @ApiPropertyOptional({
        description: 'A brief description of the product category.',
        example: 'Cold and hot drinks.',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Indicates whether the product category is active. Defaults to true.',
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}
