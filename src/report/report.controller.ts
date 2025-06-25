import { Controller, Get, Param, BadRequestException, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { ApiOperation, ApiParam, ApiResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator'; // Corrected import path for Roles decorator
import { UserRole } from '../auth/schema/user.schema';
import { SalesSummaryReportDto } from './dto/sales-summary-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetOrganizationId } from '../auth/decorators/get-organization-id.decorator'; // Import the new decorator

@ApiTags('Reports')
@Controller('reports') // Changed to plural for consistency
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
    @GetOrganizationId() organizationId: string, // Use the new decorator to get organizationId
  ): Promise<SalesSummaryReportDto> {
    this.logger.log(
      `Request for sales summary for event ${eventId} from organization ${organizationId}`,
    );
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }
    // Pass the organizationId to the service for authorization within the service layer
    return this.reportService.getSalesSummary(eventId, organizationId);
  }
}
