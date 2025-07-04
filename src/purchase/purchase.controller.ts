import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator'; // Corrected import path for Roles decorator
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/schema/user.schema';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
import { PaymentStatus } from './entities/purchase.entity';
import { FindAllPurchasesQueryDto } from './dto/find-all-purchase-query.dto';
import { GetOrganizationId } from '../auth/decorators/get-organization-id.decorator'; // Import the new decorator

@Controller('purchases') // Changed to plural for RESTful consistency
@ApiBearerAuth() // Indicates that JWT authentication is required for all endpoints in this controller
@UseGuards(JwtAuthGuard) // Apply JwtAuthGuard to all endpoints by default
export class PurchaseController {
  private readonly logger = new Logger(PurchaseController.name);

  constructor(private readonly purchaseService: PurchaseService) {}

  /**
   * Initiates a new purchase.
   * This endpoint is for any authenticated user (customer, agent, admin) to start a purchase.
   */
  @Post()
  @ApiOperation({ summary: 'Initiate a new purchase' })
  @ApiBody({ type: CreatePurchaseDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Purchase successfully initiated with PENDING status.',
    type: PurchaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data (e.g., invalid event/ticket IDs, inconsistent currencies).',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event, buyer, or ticket type not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Not enough tickets available for one of the requested types.',
  })
  async create(
    @Body() createPurchaseDto: CreatePurchaseDto,
    @GetUser('_id') buyerId: string, // The ID of the authenticated user making the purchase
    @Req() request: any, // Inject the raw request object to get IP and User-Agent
  ): Promise<PurchaseResponseDto> {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];
    return this.purchaseService.create(
      createPurchaseDto,
      buyerId,
      // ipAddress,
      // userAgent,
    );
  }

  /**
   * Retrieves all purchases with pagination and filtering.
   * - Customers can only see their own purchases.
   * - Agents can see all purchases for their organization.
   * - Admins can see all purchases across all organizations.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all purchases with pagination and filtering' })
  @ApiQuery({ type: FindAllPurchasesQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of purchases.',
    type: PaginatedResponseDto<PurchaseResponseDto>,
  })
  async findAll(
    @Query() query: FindAllPurchasesQueryDto,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[],
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<PaginatedResponseDto<PurchaseResponseDto>> {
    let authUserId: string | undefined;
    let authOrgId: string | undefined;

    if (userRoles.includes(UserRole.CUSTOMER)) {
      authUserId = userId; // Customer can only see their own purchases
    } else if (userRoles.includes(UserRole.AGENT)) {
      authOrgId = organizationId; // Agent can see all purchases for their organization
    }
    // Admin will have both undefined, allowing them to query everything

    return this.purchaseService.findAll(query, authUserId, authOrgId);
  }

  /**
   * Retrieves a single purchase by its ID.
   * - Customers can only retrieve their own purchases.
   * - Agents can only retrieve purchases for their organization.
   * - Admins can retrieve any purchase.
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a purchase by ID' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the purchase' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase details.',
    type: PurchaseResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Purchase not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to access this purchase.',
  })
  async findOne(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[],
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<PurchaseResponseDto> {
    let authUserId: string | undefined;
    let authOrgId: string | undefined;

    if (userRoles.includes(UserRole.CUSTOMER)) {
      authUserId = userId;
    } else if (userRoles.includes(UserRole.AGENT)) {
      authOrgId = organizationId;
    }
    // Admin will have both undefined

    return this.purchaseService.findOne(id, authUserId, authOrgId);
  }

  /**
   * Updates the payment status of a purchase.
   * This endpoint is typically for internal use or a secure webhook from a payment gateway.
   */
  @Patch(':id/payment-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Restrict this to Admins or a dedicated system role
  @ApiOperation({ summary: 'Update the payment status of a purchase (ADMIN/SYSTEM ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the purchase' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(PaymentStatus) },
        paymentDetails: {
          type: 'object',
          properties: {
            transactionId: { type: 'string' },
            paymentDate: { type: 'string', format: 'date-time' },
            paymentReference: { type: 'string' },
            paymentGatewayResponse: { type: 'object' },
            paymentProvider: { type: 'string' },
            paymentChannel: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status successfully updated.',
    type: PurchaseResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Purchase not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment status transition.',
  })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: PaymentStatus;
      paymentDetails?: {
        transactionId?: string;
        paymentDate?: Date;
        paymentReference?: string;
        paymentGatewayResponse?: Record<string, any>;
        paymentProvider?: string;
        paymentChannel?: string;
      };
    },
  ): Promise<PurchaseResponseDto> {
    return this.purchaseService.updatePaymentStatus(
      id,
      body.status,
      body.paymentDetails,
    );
  }

  /**
   * Initiates a refund for a purchase.
   * This endpoint is for agents or admins to process refunds.
   */
  @Post(':id/refund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Initiate a refund for a purchase' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the purchase to refund' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund successfully processed.',
    type: PurchaseResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Purchase not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid refund amount or purchase not in a refundable state.',
  })
  async refundPurchase(
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string, // Use the new decorator
  ): Promise<PurchaseResponseDto> {
    // First, verify the agent has permission to refund this purchase
    // The findOne method in PurchaseService will handle the organization check
    await this.purchaseService.findOne(id, undefined, organizationId);
    return this.purchaseService.refundPurchase(
      id,
      body.amount,
      body.reason,
      userId,
    );
  }

  /**
   * Soft deletes a purchase record.
   * This is an administrative action.
   */
  @Delete(':id/soft')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete a purchase record (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the purchase' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase successfully soft-deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Purchase not found.' })
  async softDelete(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
  ): Promise<{ message: string }> {
    return this.purchaseService.softDelete(id, userId);
  }

  /**
   * Permanently deletes a purchase record. Use with extreme caution.
   * This is an administrative action.
   */
  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete a purchase record (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the purchase' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase successfully permanently deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Purchase not found.' })
  async hardDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.purchaseService.hardDelete(id);
  }
}
