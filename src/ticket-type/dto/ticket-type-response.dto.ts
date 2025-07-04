import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportedCurrency } from 'src/shared/enum/supported-currency.enum';

export class TicketTypeResponseDto {
  @ApiProperty({ description: 'The unique identifier of the ticket type.' })
  id: string;

  @ApiProperty({ description: 'The ID of the event this ticket type belongs to.' })
  eventId: string;

  @ApiProperty({ description: 'The ID of the organization that owns the event.' })
  organizationId: string;

  @ApiProperty({ description: 'Name of the ticket type (e.g., "VIP", "Regular", "Early Bird").' })
  name: string;

  @ApiPropertyOptional({ description: 'A brief description of the ticket type.' })
  description?: string;

  @ApiProperty({ description: 'The price of a single ticket of this type.' })
  price: number;

  @ApiProperty({ description: 'The currency in which the ticket is priced.' })
  currency: SupportedCurrency;

  @ApiProperty({ description: 'The total number of tickets of this type available for sale.' })
  quantity: number;

  @ApiProperty({ description: 'The number of tickets of this type that have already been sold.' })
  quantitySold: number;

  @ApiProperty({ description: 'The date and time when sales for this ticket type begin.' })
  salesStartDate: Date;

  @ApiProperty({ description: 'The date and time when sales for this ticket type end.' })
  salesEndDate: Date;

  @ApiProperty({ description: 'Whether this ticket type is currently active and available for sale.' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether tickets of this type can be refunded.' })
  isRefundable: boolean;

  @ApiProperty({ description: 'The minimum number of tickets a user must purchase in a single transaction for this type.' })
  minPurchaseQuantity: number;

  @ApiPropertyOptional({ description: 'The maximum number of tickets a user can purchase in a single transaction for this type.' })
  maxPurchaseQuantity?: number;

  @ApiProperty({ description: 'The order in which to display this ticket type on the event page.' })
  displayOrder: number;

  @ApiProperty({ description: 'If true, this ticket type won\'t be shown publicly.' })
  isHidden: boolean;

  @ApiPropertyOptional({ description: 'Optional: Overrides salesEndDate for specific ticket types.' })
  availableUntil?: Date;

  @ApiPropertyOptional({ description: 'Maximum number of tickets of this type a single user can purchase in total across all transactions.' })
  purchaseLimitPerUser?: number;

  @ApiProperty({ description: 'Boolean flag indicating if the ticket type is soft-deleted.' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Timestamp of when the ticket type was created.' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of when the ticket type was last updated.' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'The ID of the user who last updated the ticket type.' })
  updatedBy?: string;
}
