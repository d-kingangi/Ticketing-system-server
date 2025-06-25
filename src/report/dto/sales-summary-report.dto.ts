import { ApiProperty } from '@nestjs/swagger';

/**
 * Defines the sales data for a single ticket type within the report.
 */
export class TicketTypeSalesDto {
  @ApiProperty({
    description: 'The ID of the ticket type.',
    example: '60c72b2f9b1d4c001c8e4a03',
  })
  ticketTypeId: string;

  @ApiProperty({
    description: 'The name of the ticket type (e.g., "VIP", "Regular").',
    example: 'VIP Pass',
  })
  ticketTypeName: string;

  @ApiProperty({
    description: 'The total number of tickets sold for this type.',
    example: 150,
  })
  totalTicketsSold: number;

  @ApiProperty({
    description: 'The total revenue generated from this ticket type.',
    example: 75000,
  })
  totalRevenue: number;
}

/**
 * Defines the overall structure for the sales summary report.
 */
export class SalesSummaryReportDto {
  @ApiProperty({
    description: 'The total revenue from all completed purchases for the event.',
    example: 125000,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'The total number of tickets sold for the event.',
    example: 450,
  })
  totalTicketsSold: number;

  @ApiProperty({
    description: 'The currency of the report.',
    example: 'KES',
  })
  currency: string;

  @ApiProperty({
    description: 'A detailed breakdown of sales for each ticket type.',
    type: [TicketTypeSalesDto],
  })
  salesByTicketType: TicketTypeSalesDto[];
}
