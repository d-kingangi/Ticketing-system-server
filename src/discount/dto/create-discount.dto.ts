import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  IsArray,
  IsMongoId,
  IsBoolean,
  ArrayNotEmpty,
  ValidateIf,
} from 'class-validator';
import { DiscountType } from '../enum/discount-type.enum';
import { DiscountScope } from '../enum/discount-scope.enum';

export class CreateDiscountDto {
  @ApiProperty({ description: 'The unique, user-facing code.', example: 'SUMMER2024' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Internal description for the discount.', example: 'Summer marketing campaign' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, description: 'The type of discount.' })
  @IsEnum(DiscountType)
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({ description: 'The value of the discount (e.g., 15 for 15% or 500 for KES 500).', example: 15 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  // @ApiProperty({ description: 'The ID of the event this discount applies to.' })
  // @IsMongoId()
  // @IsNotEmpty()
  // eventId: string;

  // @ApiPropertyOptional({
  //   description: 'Array of TicketType IDs this applies to. If empty, applies to all tickets for the event.',
  //   type: [String],
  // })
  // @IsOptional()
  // @IsArray()
  // @IsMongoId({ each: true })
  // applicableTicketTypeIds?: string[];

  @ApiPropertyOptional({ description: 'Total number of times this code can be used.', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiProperty({ description: 'The date from which the discount is valid (ISO 8601).', example: '2024-06-01T00:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ description: 'The date until which the discount is valid (ISO 8601).', example: '2024-08-31T23:59:59Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: Date;

  @ApiPropertyOptional({ description: 'Whether the discount is active.', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    enum: DiscountScope,
    description: "The scope of the discount: 'EVENT' or 'PRODUCT'.",
  })
  @IsEnum(DiscountScope)
  @IsNotEmpty()
  scope: DiscountScope;

  @ApiPropertyOptional({
    description: "The ID of the event. Required if scope is 'EVENT'.",
  })
  @ValidateIf(o => o.scope === DiscountScope.EVENT)
  @IsNotEmpty()
  @IsMongoId()
  eventId?: string;

  @ApiPropertyOptional({
    description: "Array of TicketType IDs. If empty, applies to all tickets for the event. Only valid if scope is 'EVENT'.",
    type: [String],
  })
  @ValidateIf(o => o.scope === DiscountScope.EVENT)
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableTicketTypeIds?: string[];

  @ApiPropertyOptional({
    description: "Array of Product IDs. If empty, applies to all products. Only valid if scope is 'PRODUCT'.",
    type: [String],
  })
  @ValidateIf(o => o.scope === DiscountScope.PRODUCT)
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProductIds?: string[];

  @ApiPropertyOptional({
    description: "Array of ProductCategory IDs. Applies to all products in these categories. Only valid if scope is 'PRODUCT'.",
    type: [String],
  })
  @ValidateIf(o => o.scope === DiscountScope.PRODUCT)
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProductCategoryIds?: string[];

}
