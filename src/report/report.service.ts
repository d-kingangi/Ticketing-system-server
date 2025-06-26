import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventService } from 'src/event/event.service';
import { Purchase, PurchaseDocument, PaymentStatus } from 'src/purchase/entities/purchase.entity';
import { SalesSummaryReportDto, TicketTypeSalesDto } from './dto/sales-summary-report.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    // Inject the Mongoose Model for Purchase to run aggregation queries.
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    // Inject EventService to validate event existence and permissions.
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
    const event = await this.eventService.findOne(eventId, organizationId);
    if (!event) {
      throw new NotFoundException(
        `Event with ID "${eventId}" not found or not part of your organization.`,
      );
    }

    // Define the aggregation pipeline to calculate sales data.
    const salesPipeline = [
      // Stage 1: Filter for relevant purchases.
      // This is the most important step for performance.
      {
        $match: {
          eventId: new Types.ObjectId(eventId),
          paymentStatus: PaymentStatus.COMPLETED, // Only include successful purchases.
          isDeleted: false,
        },
      },
      // Stage 2: Deconstruct the 'tickets' array.
      // This creates a separate document for each item in the purchase's tickets array.
      {
        $unwind: '$tickets',
      },
      // Stage 3: Group by ticketTypeId to aggregate sales data.
      {
        $group: {
          _id: '$tickets.ticketTypeId', // Group by the ticket type's ID.
          totalTicketsSold: { $sum: '$tickets.quantity' }, // Sum the quantity for each ticket type.
          totalRevenue: {
            // Sum the revenue (quantity * price) for each type.
            $sum: { $multiply: ['$tickets.quantity', '$tickets.unitPrice'] },
          },
        },
      },
      // Stage 4: (Optional but Recommended) Join with the 'tickettypes' collection.
      // This adds the human-readable name of the ticket type to our report.
      {
        $lookup: {
          from: 'tickettypes', // The collection name for TicketType.
          localField: '_id', // Field from the $group stage output.
          foreignField: '_id', // Field from the tickettypes collection.
          as: 'ticketTypeDetails', // The name of the new array field to add.
        },
      },
      // Stage 5: Reshape the output documents for the final report.
      {
        $project: {
          _id: 0, // Exclude the default _id field from the output.
          ticketTypeId: '$_id',
          // Get the name from the lookup result. Use $ifNull to handle cases where a ticket type might have been deleted.
          ticketTypeName: {
            $ifNull: [{ $arrayElemAt: ['$ticketTypeDetails.name', 0] }, 'Unknown'],
          },
          totalTicketsSold: '$totalTicketsSold',
          totalRevenue: '$totalRevenue',
        },
      },
    ];

    // Execute the aggregation pipeline.
    const salesByTicketType: TicketTypeSalesDto[] =
      await this.purchaseModel.aggregate(salesPipeline);

    // Calculate overall totals by reducing the aggregated results.
    const totalRevenue = salesByTicketType.reduce(
      (sum, item) => sum + item.totalRevenue,
      0,
    );
    const totalTicketsSold = salesByTicketType.reduce(
      (sum, item) => sum + item.totalTicketsSold,
      0,
    );

    // Assemble the final DTO.
    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalTicketsSold,
      currency: event.currency, // Get currency from the event details.
      salesByTicketType,
    };
  }
}
