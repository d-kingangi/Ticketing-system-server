import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DiscountService } from './discount.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
// import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountResponseDto } from './dto/discount-response.dto';
import { FindAllDiscountsQueryDto } from './dto/find-all-discounts-query.dto';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schema/user.schema';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetOrganizationId } from '../auth/decorators/get-organization-id.decorator';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@ApiTags('Discounts')
@Controller('discounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountController {
  private readonly logger = new Logger(DiscountController.name);

  constructor(private readonly discountService: DiscountService) {}

  /**
   * Creates a new discount code for an event.
   * Restricted to Agents and Admins.
   */
  @Post()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new discount' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Discount successfully created.', type: DiscountResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'A discount with this code already exists for the event.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User not authorized for this organization.' })
  create(
    @Body() createDiscountDto: CreateDiscountDto,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<DiscountResponseDto> {
    this.logger.log(`User ${userId} from org ${organizationId} creating discount: ${createDiscountDto.code}`);
    return this.discountService.create(createDiscountDto, userId, organizationId);
  }

  /**
   * Retrieves a paginated list of discounts for the user's organization.
   * Restricted to Agents and Admins.
   */
  @Get()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all discounts for an organization' })
  @ApiQuery({ type: FindAllDiscountsQueryDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of discounts retrieved successfully.', type: PaginatedResponseDto<DiscountResponseDto> })
  findAll(
    @Query() queryDto: FindAllDiscountsQueryDto,
    @GetOrganizationId() organizationId: string,
  ): Promise<PaginatedResponseDto<DiscountResponseDto>> {
    return this.discountService.findAll(queryDto, organizationId);
  }

  /**
   * Retrieves a single discount by its ID.
   * Restricted to Agents and Admins of the same organization.
   */
  @Get(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a single discount by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the discount.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Discount details.', type: DiscountResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Discount not found.' })
  findOne(
    @Param('id') id: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<DiscountResponseDto> {
    return this.discountService.findOne(id, organizationId);
  }

  /**
   * Updates an existing discount.
   * Restricted to Agents and Admins of the same organization.
   */
  @Patch(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a discount' })
  @ApiParam({ name: 'id', description: 'The ID of the discount to update.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Discount updated successfully.', type: DiscountResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Discount not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<DiscountResponseDto> {
    return this.discountService.update(id, updateDiscountDto, userId, organizationId);
  }

  /**
   * Soft-deletes a discount.
   * Restricted to Agents and Admins of the same organization.
   */
  @Delete(':id/soft')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete a discount' })
  @ApiParam({ name: 'id', description: 'The ID of the discount to soft-delete.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Discount successfully soft-deleted.' })
  softDelete(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<{ message: string }> {
    return this.discountService.softDelete(id, userId, organizationId);
  }

  /**
   * Restores a soft-deleted discount.
   * Restricted to Agents and Admins of the same organization.
   */
  @Post(':id/restore')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted discount' })
  @ApiParam({ name: 'id', description: 'The ID of the discount to restore.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Discount successfully restored.', type: DiscountResponseDto })
  restore(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<DiscountResponseDto> {
    return this.discountService.restore(id, userId, organizationId);
  }
}
