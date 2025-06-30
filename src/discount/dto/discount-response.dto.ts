import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../enum/discount-type.enum';
import { DiscountScope } from '../enum/discount-scope.enum';

/**
 * DTO for representing a Discount in API responses.
 * This DTO is used to shape the data returned to clients, ensuring
 * consistency and hiding any internal or sensitive fields.
 */
export class DiscountResponseDto {
  @ApiProperty({ description: 'The unique identifier of the discount.', example: '654a3b2c1d0e9f8a7b6c5d4e' })
  id: string;

  @ApiProperty({ description: 'The unique, user-facing code.', example: 'SUMMER2024' })
  code: string;

  @ApiPropertyOptional({ description: 'Internal description for the discount.', example: 'Summer marketing campaign' })
  description?: string;

  @ApiProperty({ enum: DiscountType, description: 'The type of discount.' })
  discountType: DiscountType;

  @ApiProperty({ description: 'The value of the discount.', example: 15 })
  discountValue: number;

  @ApiProperty({ description: 'The ID of the organization this discount belongs to.', example: '60c72b2f9b1d4c001c8e4a01' })
  organizationId: string;

  @ApiProperty({ enum: DiscountScope, description: 'The scope of the discount (EVENT or PRODUCT).' })
  scope: DiscountScope;

  @ApiProperty({ description: 'The ID of the event this discount is associated with.', example: '60c72b2f9b1d4c001c8e4a02' })
  eventId: string;

  @ApiProperty({
    description: 'Array of TicketType IDs this discount applies to. If empty, applies to all tickets for the event.',
    type: [String],
    example: ['60c72b2f9b1d4c001c8e4a03', '60c72b2f9b1d4c001c8e4a04'],
  })
  applicableTicketTypeIds: string[];

  @ApiPropertyOptional({
    description: "Array of Product IDs this discount applies to. If empty, applies to all products. Only present if scope is 'PRODUCT'.",
    type: [String],
    example: ['655b65a1e8a3d4c5e6f7g8h8'],
  })
  applicableProductIds?: string[];

  @ApiPropertyOptional({
    description: "Array of ProductCategory IDs this discount applies to. Applies to all products in these categories. Only present if scope is 'PRODUCT'.",
    type: [String],
    example: ['654a3b2c1d0e9f8a7b6c5d4e'],
  })
  applicableProductCategoryIds?: string[];


  @ApiPropertyOptional({ description: 'Total number of times this discount can be used across all purchases.', example: 100 })
  usageLimit?: number;

  @ApiProperty({ description: 'The number of times this discount has already been used.', example: 5 })
  usageCount: number;

  @ApiProperty({ description: 'The date from which the discount is valid (ISO 8601).', example: '2024-06-01T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ description: 'The date until which the discount is valid (ISO 8601).', example: '2024-08-31T23:59:59.000Z' })
  endDate: Date;

  @ApiProperty({ description: 'Whether the discount is currently active and can be redeemed.', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Boolean flag indicating if the discount is soft-deleted.', example: false })
  isDeleted: boolean;

  @ApiProperty({ description: 'Timestamp of when the discount was created.', example: '2024-05-01T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of when the discount was last updated.', example: '2024-05-15T11:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'The ID of the user who last updated the discount.', example: '60c72b2f9b1d4c001c8e4a05' })
  updatedBy?: string;
}
