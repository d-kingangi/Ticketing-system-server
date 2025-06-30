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
import { ProductCategoryService } from './product-category.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { FindAllProductCategoriesQueryDto } from './dto/find-all-product-category-query.dto';
import { ProductCategoryResponseDto } from './dto/product-category-response.dto';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Note: Adjust path if needed

// I've added full API documentation and security to the controller.
@ApiTags('Product Categories')
@ApiBearerAuth() // Indicates that all endpoints in this controller require a JWT token.
@UseGuards(JwtAuthGuard) // Protects all endpoints with your authentication guard.
@Controller('product-categories') // Using plural 'product-categories' is a common REST convention.
export class ProductCategoryController {
    constructor(
        private readonly productCategoryService: ProductCategoryService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new product category' })
    @ApiResponse({ status: 201, description: 'The category has been successfully created.', type: ProductCategoryResponseDto })
    @ApiResponse({ status: 400, description: 'Bad Request. Invalid input data.' })
    @ApiResponse({ status: 409, description: 'Conflict. Category with this name already exists.' })
    create(
        @Body() createDto: CreateProductCategoryDto,
        @Req() req: any, // Using @Req to get the authenticated user.
    ): Promise<ProductCategoryResponseDto> {
        // I'm extracting the user and organization IDs from the request object, which is populated by the auth guard.
        const { organizationId, _id: userId } = req.user;
        return this.productCategoryService.create(
            createDto,
            organizationId,
            userId,
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get a paginated list of product categories' })
    @ApiQuery({ type: FindAllProductCategoriesQueryDto })
    @ApiResponse({ status: 200, description: 'A paginated list of product categories.', type: PaginatedResponseDto<ProductCategoryResponseDto> })
    findAll(
        @Query() queryDto: FindAllProductCategoriesQueryDto,
        @Req() req: any,
    ): Promise<PaginatedResponseDto<ProductCategoryResponseDto>> {
        const { organizationId } = req.user;
        return this.productCategoryService.findAll(queryDto, organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single product category by ID' })
    @ApiParam({ name: 'id', description: 'The ID of the product category', type: String })
    @ApiResponse({ status: 200, description: 'The found category record.', type: ProductCategoryResponseDto })
    @ApiResponse({ status: 404, description: 'Category not found.' })
    findOne(
        @Param('id') id: string,
        @Req() req: any,
    ): Promise<ProductCategoryResponseDto> {
        const { organizationId } = req.user;
        return this.productCategoryService.findOne(id, organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a product category' })
    @ApiParam({ name: 'id', description: 'The ID of the category to update', type: String })
    @ApiResponse({ status: 200, description: 'The category has been successfully updated.', type: ProductCategoryResponseDto })
    @ApiResponse({ status: 404, description: 'Category not found.' })
    update(
        @Param('id') id: string,
        @Body() updateDto: UpdateProductCategoryDto,
        @Req() req: any,
    ): Promise<ProductCategoryResponseDto> {
        const { organizationId, _id: userId } = req.user;
        return this.productCategoryService.update(
            id,
            updateDto,
            organizationId,
            userId,
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT) // Setting the success status code to 204 No Content.
    @ApiOperation({ summary: 'Soft-delete a product category' })
    @ApiParam({ name: 'id', description: 'The ID of the category to delete', type: String })
    @ApiResponse({ status: 204, description: 'The category has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Category not found.' })
    remove(@Param('id') id: string, @Req() req: any): Promise<void> {
        const { organizationId, _id: userId } = req.user;
        return this.productCategoryService.remove(id, organizationId, userId);
    }
}
