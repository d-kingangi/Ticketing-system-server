import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../entities/purchase.entity';
import { SupportedCurrency } from 'src/shared/enum/supported-currency.enum';

export class PurchaseTicketItemResponseDto {
  @ApiProperty({ description: 'The ID of the ticket type purchased.' })
  ticketTypeId: string;

  @ApiProperty({ description: 'The quantity of this ticket type purchased.' })
  quantity: number;

  @ApiProperty({ description: 'The final price per unit after any discounts.' })
  unitPrice: number;

  @ApiProperty({ description: 'The total discount amount applied to this line item.' })
  discountAmount: number;
}

export class PurchaseProductItemResponseDto {
  @ApiProperty({ description: 'The ID of the product purchased.' })
  productId: string;

  @ApiPropertyOptional({ description: 'The ID of the specific product variation purchased.' })
  variationId?: string;

  @ApiProperty({ description: 'The quantity of this product purchased.' })
  quantity: number;

  @ApiProperty({ description: 'The final price per unit after any discounts.' })
  unitPrice: number;

  @ApiProperty({ description: 'The total discount amount applied to this line item.' })
  discountAmount: number;
}


// Nested DTO for payment details in a purchase response
export class PaymentDetailsResponseDto {
  @ApiPropertyOptional({ description: 'Unique ID from the payment gateway.' })
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Date and time payment was confirmed.' })
  paymentDate?: Date;

  @ApiPropertyOptional({ description: 'User-facing payment reference (e.g., M-Pesa code).' })
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Raw response from payment gateway for auditing.' })
  paymentGatewayResponse?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Payment provider (e.g., "Safaricom M-Pesa", "Stripe").' })
  paymentProvider?: string;

  @ApiPropertyOptional({ description: 'Payment channel (e.g., "M-Pesa Express", "Card (Visa)").' })
  paymentChannel?: string;
}

export class PurchaseResponseDto {
  @ApiProperty({ description: 'The unique identifier of the purchase.' })
  id: string;

  @ApiProperty({ description: 'The ID of the user who made this purchase.' })
  buyerId: string;

  @ApiProperty({ description: 'The ID of the event for which tickets were purchased.' })
  eventId: string;

  @ApiProperty({ description: 'The ID of the organization that owns the event.' })
  organizationId: string;

  @ApiPropertyOptional({ description: 'An array detailing the ticket types and quantities purchased.', type: [PurchaseTicketItemResponseDto] })
  ticketItems?: PurchaseTicketItemResponseDto[];

  // I've added the new 'productItems' property.
  @ApiPropertyOptional({ description: 'An array detailing the products and quantities purchased.', type: [PurchaseProductItemResponseDto] })
  productItems?: PurchaseProductItemResponseDto[];

  @ApiProperty({ description: 'The total amount paid for this purchase.' })
  totalAmount: number;

  @ApiPropertyOptional({ description: 'The ID of the discount that was applied to this purchase.' })
  appliedDiscountId?: string;

  @ApiPropertyOptional({ description: 'The total monetary value saved from the applied discount.' })
  discountAmountSaved?: number;

  @ApiProperty({ description: 'The currency of the total amount.' })
  currency: SupportedCurrency;

  @ApiProperty({ description: 'The current status of the payment for this purchase.' })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'The method used for payment.' })
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Detailed information about the payment transaction.', type: PaymentDetailsResponseDto })
  paymentDetails?: PaymentDetailsResponseDto;

  @ApiProperty({ description: 'A flag indicating whether individual Ticket documents have been generated.' })
  ticketsGenerated: boolean;

  // @ApiPropertyOptional({ description: 'The IP address of the buyer at the time of purchase.' })
  // ipAddress?: string;

  // @ApiPropertyOptional({ description: 'The User-Agent string of the buyer\'s device.' })
  // userAgent?: string;

  // @ApiPropertyOptional({ description: 'Any internal notes or remarks about the purchase.' })
  // notes?: string;

  @ApiProperty({ description: 'Boolean flag indicating if the purchase record is soft-deleted.' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Timestamp of when the purchase was created.' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of when the purchase was last updated.' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'The ID of the user who last updated the purchase.' })
  updatedBy?: string;
}
