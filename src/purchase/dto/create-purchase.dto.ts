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
} from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTO for individual items within a purchase
export class PurchaseItemDto {
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

export class CreatePurchaseDto {
  @ApiProperty({ description: 'The ID of the event for which tickets are being purchased.', example: '60c72b2f9b1d4c001c8e4a01' })
  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: 'An array of ticket types and quantities to purchase.',
    type: [PurchaseItemDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  tickets: PurchaseItemDto[];

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
