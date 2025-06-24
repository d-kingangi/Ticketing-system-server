import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../entities/purchase.entity';
import { SupportedCurrencies } from '../../ticket-type/entities/ticket-type.entity';

// Nested DTO for individual items within a purchase response
export class PurchaseItemResponseDto {
  @ApiProperty({ description: 'The ID of the ticket type purchased.' })
  ticketTypeId: string;

  @ApiProperty({ description: 'The quantity of this ticket type purchased.' })
  quantity: number;

  @ApiProperty({ description: 'The price per unit of this ticket type at the time of purchase.' })
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Whether a discount was applied to this line item.' })
  discountApplied?: boolean;

  @ApiPropertyOptional({ description: 'Details of the discount applied to this line item.' })
  discountDetails?: {
    type: string;
    value: number;
    code?: string;
  };
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

// Nested DTO for refund details in a purchase response
// export class RefundDetailsResponseDto {
//   @ApiProperty({ description: 'Unique ID for the refund transaction.' })
//   refundId: string;

//   @ApiProperty({ description: 'Amount refunded in this specific transaction.' })
//   amount: number;

//   @ApiProperty({ description: 'Date of the refund.' })
//   refundDate: Date;

//   @ApiPropertyOptional({ description: 'Reason for the refund.' })
//   reason?: string;

//   @ApiPropertyOptional({ description: 'ID of the user who processed the refund.' })
//   processedBy?: string;
// }

export class PurchaseResponseDto {
  @ApiProperty({ description: 'The unique identifier of the purchase.' })
  id: string;

  @ApiProperty({ description: 'The ID of the user who made this purchase.' })
  buyerId: string;

  @ApiProperty({ description: 'The ID of the event for which tickets were purchased.' })
  eventId: string;

  @ApiProperty({ description: 'The ID of the organization that owns the event.' })
  organizationId: string;

  @ApiProperty({ description: 'An array detailing the ticket types and quantities purchased.', type: [PurchaseItemResponseDto] })
  tickets: PurchaseItemResponseDto[];

  @ApiProperty({ description: 'The total amount paid for this purchase.' })
  totalAmount: number;

  @ApiProperty({ description: 'The currency of the total amount.' })
  currency: SupportedCurrencies;

  @ApiProperty({ description: 'The current status of the payment for this purchase.' })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'The method used for payment.' })
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Detailed information about the payment transaction.', type: PaymentDetailsResponseDto })
  paymentDetails?: PaymentDetailsResponseDto;

  @ApiProperty({ description: 'A flag indicating whether individual Ticket documents have been generated.' })
  ticketsGenerated: boolean;

  @ApiPropertyOptional({ description: 'The IP address of the buyer at the time of purchase.' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'The User-Agent string of the buyer\'s device.' })
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Any internal notes or remarks about the purchase.' })
  notes?: string;

//   @ApiProperty({ description: 'The total amount that has been refunded for this purchase.' })
//   refundAmount: number;

//   @ApiProperty({ description: 'An array to log individual refund transactions for this purchase.', type: [RefundDetailsResponseDto] })
//   refunds: RefundDetailsResponseDto[];

  @ApiProperty({ description: 'Boolean flag indicating if the purchase record is soft-deleted.' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Timestamp of when the purchase was created.' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of when the purchase was last updated.' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'The ID of the user who last updated the purchase.' })
  updatedBy?: string;
}
