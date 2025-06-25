import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsNumber,
  Min,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum, // Added IsEnum for currency validation
} from 'class-validator';
import { SupportedCurrencies } from '../../ticket-type/entities/ticket-type.entity'; // Import SupportedCurrencies enum


export class CreateTicketDto {
  @ApiProperty({ description: 'The ID of the ticket type this ticket belongs to.', example: '60c72b2f9b1d4c001c8e4a03' })
  @IsMongoId()
  @IsNotEmpty()
  ticketTypeId: string;

  @ApiProperty({ description: 'The ID of the event this ticket grants access to.', example: '60c72b2f9b1d4c001c8e4a01' })
  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ description: 'The ID of the organization that owns the event.', example: '60c72b2f9b1d4c001c8e4a02' })
  @IsMongoId()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'The ID of the purchase record that generated this ticket.', example: '60c72b2f9b1d4c001c8e4a04' })
  @IsMongoId()
  @IsNotEmpty()
  purchaseId: string;

  @ApiProperty({ description: 'The ID of the user who owns this ticket.', example: '60c72b2f9b1d4c001c8e4a05' })
  @IsMongoId()
  @IsNotEmpty()
  ownerId: string;

  @ApiProperty({ description: 'The price of this specific ticket at the time of purchase.', example: 50.00 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  priceAtPurchase: number;

  @ApiProperty({ description: 'The currency of the ticket at the time of purchase.', enum: SupportedCurrencies, example: SupportedCurrencies.KES })
  @IsEnum(SupportedCurrencies) // Validates against the enum
  @IsNotEmpty()
  currencyAtPurchase: SupportedCurrencies; // Type is now the enum itself

  @ApiPropertyOptional({ description: 'Indicates if this ticket can be transferred to another user.', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isTransferable?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
