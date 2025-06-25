import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { ReportService } from './report.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/guards/client-access.guard';
import { UserRole } from 'src/auth/schema/user.schema';
import { SalesSummaryReportDto } from './dto/sales-summary-report.dto';

@Controller('report')
export class ReportController {

  private readonly logger = new Logger(ReportController.name);

  constructor(private readonly reportService: ReportService) {}

  /**
   * Endpoint to generate and retrieve a sales summary for a specific event.
   * Accessible only by AGENT and ADMIN roles.
   */
  @Get('sales-summary/:eventId')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a sales summary report for an event' })
  @ApiParam({
    name: 'eventId',
    required: true,
    description: 'The ID of the event',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sales summary report generated successfully.',
    type: SalesSummaryReportDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource. You do not have access to this event.',
  })
  async getSalesSummary(
    @Param('eventId') eventId: string,
    @GetUser('organizationId') organizationId: string, // Get organizationId from the authenticated user's token.
  ): Promise<SalesSummaryReportDto> {
    this.logger.log(
      `Request for sales summary for event ${eventId} from organization ${organizationId}`,
    );
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }
    return this.reportService.getSalesSummary(eventId, organizationId);
  }
}
