import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, Logger, HttpCode, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GetOrganizationId } from 'src/auth/decorators/get-organization-id.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/schema/user.schema';
import { ProductResponseDto } from './dto/product-response.dto';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { FindAllProductsQueryDto } from './dto/find-all-products-query.dto';

@ApiTags('Products')
@ApiBearerAuth() // This indicates that all endpoints in this controller require a JWT token.
@UseGuards(JwtAuthGuard, RolesGuard) // This protects all endpoints with authentication and role-based access control.
@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) { }

  /**
     * I've implemented the 'create' endpoint to handle the creation of new products.
     * It's restricted to users with 'AGENT' or 'ADMIN' roles.
     * It extracts organization and user IDs from the authenticated request for data ownership.
     */
  @Post()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'The product has been successfully created.', type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request. Invalid input data.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Conflict. A product with this name already exists.' })
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<ProductResponseDto> {
    this.logger.log(`User ${userId} from org ${organizationId} is creating a product.`);
    return this.productService.create(createProductDto, organizationId, userId);
  }


  /**
   * I've implemented the 'findAll' endpoint to retrieve a paginated and filterable list of products.
   * This is also restricted to 'AGENT' and 'ADMIN' roles and is scoped to their organization.
   */
  @Get()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a paginated list of products' })
  @ApiQuery({ type: FindAllProductsQueryDto }) // I'm using the DTO to define the shape of query parameters.
  @ApiResponse({ status: HttpStatus.OK, description: 'A paginated list of products.', type: PaginatedResponseDto<ProductResponseDto> })
  findAll(
    @Query() queryDto: FindAllProductsQueryDto,
    @GetOrganizationId() organizationId: string,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    return this.productService.findAll(queryDto, organizationId);
  }

  /**
   * I've implemented the 'findOne' endpoint to fetch a single product by its ID.
   * The service layer ensures the product belongs to the user's organization.
   */
  @Get(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the product', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'The found product record.', type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found.' })
  findOne(
    @Param('id') id: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<ProductResponseDto> {
    return this.productService.findOne(id, organizationId);
  }

  /**
   * I've implemented the 'update' endpoint to modify an existing product.
   * It's restricted to 'AGENT' and 'ADMIN' roles.
   */
  @Patch(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'The ID of the product to update', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'The product has been successfully updated.', type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found.' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<ProductResponseDto> {
    return this.productService.update(id, updateProductDto, organizationId, userId);
  }

  /**
   * I've implemented the 'remove' endpoint for soft-deleting a product.
   * It returns a 204 No Content on success, which is a standard REST practice for delete operations.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // I'm setting the success status code to 204 No Content.
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a product' })
  @ApiParam({ name: 'id', description: 'The ID of the product to delete', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'The product has been successfully deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found.' })
  remove(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetOrganizationId() organizationId: string,
  ): Promise<void> {
    return this.productService.remove(id, organizationId, userId);
  }
}
