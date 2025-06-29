import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FindAllCustomersQueryDto } from './dto/find-all-customers-query.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Customers')
@ApiBearerAuth() // Indicates that all endpoints in this controller require a JWT token.
@UseGuards(JwtAuthGuard) // Protects all endpoints with your authentication guard.
@Controller('customers') // Using plural 'customers' is a common REST convention.
export class CustomerController {
  constructor(private readonly customerService: CustomerService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'The customer has been successfully created.', type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid input data.' })
  @ApiResponse({ status: 409, description: 'Conflict. Customer with this email already exists.' })
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: any, // Using @Req to get the authenticated user.
  ): Promise<CustomerResponseDto> {
    // I'm extracting the user and organization IDs from the request object, which is populated by the auth guard.
    const { organizationId, _id: userId } = req.user;
    return this.customerService.create(createCustomerDto, organizationId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get a paginated list of customers' })
  @ApiQuery({ type: FindAllCustomersQueryDto })
  @ApiResponse({ status: 200, description: 'A paginated list of customers.', type: PaginatedResponseDto<CustomerResponseDto> })
  findAll(
    @Query() queryDto: FindAllCustomersQueryDto,
    @Req() req: any,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const { organizationId } = req.user;
    return this.customerService.findAll(queryDto, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the customer', type: String })
  @ApiResponse({ status: 200, description: 'The found customer record.', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<CustomerResponseDto> {
    // I've corrected the parameter handling. Mongoose IDs are strings, so no conversion (`+id`) is needed.
    const { organizationId } = req.user;
    return this.customerService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', description: 'The ID of the customer to update', type: String })
  @ApiResponse({ status: 200, description: 'The customer has been successfully updated.', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Req() req: any,
  ): Promise<CustomerResponseDto> {
    const { organizationId, _id: userId } = req.user;
    return this.customerService.update(id, updateCustomerDto, organizationId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Setting the success status code to 204 No Content.
  @ApiOperation({ summary: 'Soft-delete a customer' })
  @ApiParam({ name: 'id', description: 'The ID of the customer to delete', type: String })
  @ApiResponse({ status: 204, description: 'The customer has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<void> {
    const { organizationId, _id: userId } = req.user;
    return this.customerService.remove(id, organizationId, userId);
  }
}
