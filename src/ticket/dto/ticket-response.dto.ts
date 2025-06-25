import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '../entities/ticket.entity';

// Nested DTO for transfer history
export class TransferHistoryDto {
  @ApiProperty({ description: 'The ID of the user who transferred the ticket.' })
  from: string;

  @ApiProperty({ description: 'The ID of the user who received the ticket.' })
  to: string;

  @ApiProperty({ description: 'The date and time of the transfer.' })
  date: Date;
}

export class TicketResponseDto {
  @ApiProperty({ description: 'The unique identifier of the ticket.' })
  id: string;

  @ApiProperty({ description: 'The ID of the ticket type this ticket belongs to.' })
  ticketTypeId: string;

  @ApiProperty({ description: 'The ID of the event this ticket grants access to.' })
  eventId: string;

  @ApiProperty({ description: 'The ID of the organization that owns the event.' })
  organizationId: string;

  @ApiProperty({ description: 'The ID of the purchase record that generated this ticket.' })
  purchaseId: string;

  @ApiProperty({ description: 'The ID of the user who currently owns this ticket.' })
  ownerId: string;

  @ApiProperty({ description: 'The current status of the ticket.', enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty({ description: 'A unique code for validating the ticket.' })
  ticketCode: string;

  @ApiProperty({ description: 'URL or path to the generated QR code image for this ticket.' })
  qrCode: string;

  @ApiProperty({ description: 'The price of this specific ticket at the time of purchase.' })
  priceAtPurchase: number;

  @ApiProperty({ description: 'The currency of the ticket at the time of purchase.' })
  currencyAtPurchase: string;

  @ApiPropertyOptional({ description: 'Date and time when the ticket was scanned and marked as "used".' })
  scannedAt?: Date;

  @ApiPropertyOptional({ description: 'ID of the user (e.g., event staff) who scanned the ticket.' })
  scannedBy?: string;

  @ApiPropertyOptional({ description: 'Specific location where the ticket was checked in (e.g., "Gate A").' })
  checkInLocation?: string;

  @ApiProperty({ description: 'Counter for failed attempts to scan/redeem this ticket.' })
  redemptionAttempts: number;

  @ApiProperty({ description: 'Indicates if this ticket can be transferred to another user.' })
  isTransferable: boolean;

  @ApiPropertyOptional({ description: 'If transferred, the ID of the user this ticket was last transferred to.' })
  transferredTo?: string;

  @ApiProperty({ description: 'An array to log the history of ticket transfers.', type: [TransferHistoryDto] })
  transferHistory: TransferHistoryDto[];

  @ApiPropertyOptional({ description: 'Any additional, unstructured data related to the ticket.' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Boolean flag indicating if the ticket record is soft-deleted.' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Timestamp of when the ticket was created.' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of when the ticket was last updated.' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'The ID of the user who last updated the ticket.' })
  updatedBy?: string;
}
