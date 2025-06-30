import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductCategoryResponseDto {
    @ApiProperty({
        description: 'The unique identifier of the product category.',
        example: '654a3b2c1d0e9f8a7b6c5d4e',
    })
    id: string;

    @ApiProperty({
        description: 'The name of the product category.',
        example: 'Beverages',
    })
    name: string;

    @ApiPropertyOptional({
        description: 'A brief description of the product category.',
        example: 'Cold and hot drinks.',
    })
    description?: string;

    @ApiProperty({
        description: 'ID of the organization this category belongs to.',
        example: '654a3b2c1d0e9f8a7b6c5d4f',
    })
    organizationId: string;

    @ApiProperty({
        description: 'Indicates whether the product category is active.',
        example: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'The timestamp when the category was created.',
        example: '2023-11-05T10:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'The timestamp when the category was last updated.',
        example: '2023-11-05T11:30:00.000Z',
    })
    updatedAt: Date;
}
