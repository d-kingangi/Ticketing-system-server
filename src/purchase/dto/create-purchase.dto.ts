import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
  IsOptional,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTO for individual items within a purchase
export class PurchaseTicketItemDto {
  @ApiProperty({ description: 'The ID of the ticket type being purchased.', example: '60c72b2f9b1d4c001c8e4a03' })
  @IsMongoId()
  @IsNotEmpty()
  ticketTypeId: string;

  @ApiProperty({ description: 'The quantity of this ticket type to purchase.', example: 2 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

export class PurchaseProductItemDto {
  @ApiProperty({ description: 'The ID of the product being purchased.', example: '655b65a1e8a3d4c5e6f7g8h8' })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  // This is optional, only for 'variable' products.
  @ApiPropertyOptional({ description: 'The ID of the specific product variation.', example: '655b65a1e8a3d4c5e6f7g8h9' })
  @IsOptional()
  @IsMongoId()
  variationId?: string;

  @ApiProperty({ description: 'The quantity of this product to purchase.', example: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}


export class CreatePurchaseDto {
  @ApiProperty({ description: 'The ID of the event for which tickets are being purchased.', example: '60c72b2f9b1d4c001c8e4a01' })
  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({
    description: 'An array of ticket types and quantities to purchase.',
    type: [PurchaseTicketItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseTicketItemDto)
  ticketItems?: PurchaseTicketItemDto[];

  // I've added the new 'productItems' property, also optional.
  // The service layer will be responsible for ensuring that at least one of 'ticketItems' or 'productItems' is provided.
  @ApiPropertyOptional({
    description: 'An array of products and quantities to purchase.',
    type: [PurchaseProductItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseProductItemDto)
  productItems?: PurchaseProductItemDto[];


  @ApiProperty({ description: 'The payment method chosen by the buyer (e.g., "M-Pesa", "Card", "PayPal").', example: 'M-Pesa' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({
    description: 'An optional discount code to apply to the purchase.',
    example: 'EVENT2024',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  discountCode?: string;

  @ApiPropertyOptional({ description: 'Any additional notes from the buyer.' })
  @IsOptional()
  @IsString()
  notes?: string;


  // paymentDetails (transactionId, paymentDate, etc.) will be populated by the backend after payment processing.

  // @ApiPropertyOptional({ description: 'The IP address of the buyer (can be captured by backend).', example: '192.168.1.1' })
  // @IsOptional()
  // @IsString()
  // ipAddress?: string;

  // @ApiPropertyOptional({ description: 'The User-Agent string of the buyer\'s device (can be captured by backend).', example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' })
  // @IsOptional()
  // @IsString()
  // userAgent?: string;

  // @ApiPropertyOptional({ description: 'Any additional notes from the buyer.', example: 'Please ensure seats are together.' })
  // @IsOptional()
  // @IsString()
  // notes?: string;
}
