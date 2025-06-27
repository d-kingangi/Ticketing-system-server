import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventService } from 'src/event/event.service';
import { Purchase, PurchaseDocument, PaymentStatus } from 'src/purchase/entities/purchase.entity';
import { SalesSummaryReportDto, TicketTypeSalesDto } from './dto/sales-summary-report.dto';
import { SupportedCurrencies } from 'src/ticket-type/entities/ticket-type.entity';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Generates a sales summary report for a given event.
   * @param eventId The ID of the event to generate the report for.
   * @param organizationId The organization ID of the user requesting the report, for authorization.
   * @returns A promise that resolves to the sales summary report.
   */
  async getSalesSummary(
    eventId: string,
    organizationId: string,
  ): Promise<SalesSummaryReportDto> {
    this.logger.log(
      `Generating sales summary report for event: ${eventId} within organization: ${organizationId}`,
    );

    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }

    // First, validate that the event exists and belongs to the organization.
    // This check remains important for authorization.
    await this.eventService.findOne(eventId, organizationId);

    // Define the aggregation pipeline to calculate sales data.
    const salesPipeline = [
      // Stage 1: Filter for relevant purchases.
      {
        $match: {
          eventId: new Types.ObjectId(eventId),
          paymentStatus: PaymentStatus.COMPLETED,
          isDeleted: false,
        },
      },
      // Stage 2: Deconstruct the 'tickets' array.
      {
        $unwind: '$tickets',
      },
      // Stage 3: Group by ticketTypeId to aggregate sales data.
      {
        $group: {
          _id: '$tickets.ticketTypeId',
          totalTicketsSold: { $sum: '$tickets.quantity' },
          // CHANGE: Corrected the field from 'priceAtPurchase' to 'unitPrice' to match the PurchaseTicketItem schema.
          // This ensures accurate revenue calculation.
          totalRevenue: {
            $sum: { $multiply: ['$tickets.quantity', '$tickets.unitPrice'] },
          },
          // CHANGE: Extract the currency from the first purchase document in the group.
          // Since all purchases for an event should have the same currency, this is a reliable way to get it.
          currency: { $first: '$currency' },
        },
      },
      // Stage 4: Join with the 'tickettypes' collection to get the ticket type name.
      {
        $lookup: {
          from: 'tickettypes',
          localField: '_id',
          foreignField: '_id',
          as: 'ticketTypeDetails',
        },
      },
      // Stage 5: Reshape the output documents.
      {
        $project: {
          _id: 0,
          ticketTypeId: '$_id',
          ticketTypeName: {
            $ifNull: [{ $arrayElemAt: ['$ticketTypeDetails.name', 0] }, 'Unknown'],
          },
          totalTicketsSold: '$totalTicketsSold',
          totalRevenue: '$totalRevenue',
          // CHANGE: Include the currency in the projected output.
          currency: '$currency',
        },
      },
    ];

    // Execute the aggregation pipeline.
    // The result will now include the currency for each ticket type summary.
    const salesByTicketType: (TicketTypeSalesDto & { currency: SupportedCurrencies })[] =
      await this.purchaseModel.aggregate(salesPipeline);

    // Calculate overall totals.
    const totalRevenue = salesByTicketType.reduce(
      (sum, item) => sum + item.totalRevenue,
      0,
    );
    const totalTicketsSold = salesByTicketType.reduce(
      (sum, item) => sum + item.totalTicketsSold,
      0,
    );

    // CHANGE: Get the currency from the first item in the aggregation result.
    // If there are no sales, the currency will be undefined, which is acceptable.
    const currency = salesByTicketType.length > 0 ? salesByTicketType[0].currency : undefined;

    // Assemble the final DTO.
    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalTicketsSold,
      // CHANGE: Use the currency derived from the purchase data.
      currency: currency,
      salesByTicketType,
    };
  }
}
