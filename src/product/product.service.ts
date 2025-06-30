import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './product.repository';
import { ProductCategoryService } from 'src/product-category/product-category.service';
import { ProductDocument } from './entities/product.entity';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductType } from './interfaces/product.interfaces';
import { Types } from 'mongoose';
import { FindAllProductsQueryDto } from './dto/find-all-products-query.dto';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);

    constructor(
        private readonly productRepository: ProductRepository,
        private readonly productCategoryService: ProductCategoryService,
    ) { }

    /**
     * I've created this private helper to map a database document to a response DTO.
     * This is where the business logic for calculating sale prices resides, ensuring
     * a consistent and client-friendly response structure.
     * @param product - The product document from the database.
     * @returns A DTO suitable for API responses with computed sale fields.
     */
    private _mapToResponseDto(product: ProductDocument): ProductResponseDto {
        const now = new Date();

        // Helper function to determine if a product/variation is on sale.
        const isSaleActive = (
            salePrice?: number,
            startDate?: Date,
            endDate?: Date,
        ): boolean => {
            return (
                salePrice != null &&
                (!startDate || startDate <= now) &&
                (!endDate || endDate >= now)
            );
        };

        const response: ProductResponseDto = {
            id: product._id.toString(),
            productType: product.productType,
            name: product.name,
            description: product.description,
            productCategoryId: product.productCategoryId.toString(),
            organizationId: product.organizationId.toString(),
            isActive: product.isActive,
            isTrackable: product.isTrackable,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
        };

        if (product.productType === ProductType.SIMPLE) {
            const onSale = isSaleActive(
                product.salePrice,
                product.saleStartDate,
                product.saleEndDate,
            );
            Object.assign(response, {
                sku: product.sku,
                price: product.price,
                cost: product.cost,
                quantity: product.quantity,
                imageUrl: product.imageUrl,
                salePrice: product.salePrice,
                saleStartDate: product.saleStartDate,
                saleEndDate: product.saleEndDate,
                isOnSale: onSale,
                currentPrice: onSale ? product.salePrice : product.price,
                originalPrice: onSale ? product.price : undefined,
            });
        } else {
            Object.assign(response, {
                variationOptions: product.variationOptions,
                variations: product.variations?.map((v: VariationDocument) => {
                    const onSale = isSaleActive(v.salePrice, v.saleStartDate, v.saleEndDate);
                    return {
                        id: v._id.toString(),
                        attributes: v.attributes,
                        sku: v.sku,
                        price: v.price,
                        cost: v.cost,
                        quantity: v.quantity,
                        imageUrl: v.imageUrl,
                        salePrice: v.salePrice,
                        saleStartDate: v.saleStartDate,
                        saleEndDate: v.saleEndDate,
                        isOnSale: onSale,
                        currentPrice: onSale ? v.salePrice : v.price,
                        originalPrice: onSale ? v.price : undefined,
                    };
                }),
            });
        }

        return response;
    }

    /**
     * I've created this private helper to validate the integrity of a variable product's data.
     * It ensures that all variation SKUs are unique within the same product.
     * @param dto - The DTO for creating or updating a product.
     */
    private _validateVariableProduct(dto: CreateProductDto | UpdateProductDto): void {
        if (dto.productType === ProductType.VARIABLE && dto.variations) {
            const skus = new Set<string>();
            for (const variation of dto.variations) {
                if (skus.has(variation.sku.toUpperCase())) {
                    throw new BadRequestException(
                        `Duplicate SKU "${variation.sku}" found in variations.`,
                    );
                }
                skus.add(variation.sku.toUpperCase());
            }
        }
    }

    /**
     * Creates a new product for a specific organization.
     * @param createDto - The data for the new product.
     * @param organizationId - The ID of the organization the product belongs to.
     * @param userId - The ID of the user creating the product.
     * @returns The newly created product.
     * @throws ConflictException if a product with the same name already exists.
     * @throws NotFoundException if the specified product category does not exist.
     */
    async create(
        createDto: CreateProductDto,
        organizationId: string,
        userId: string,
    ): Promise<ProductResponseDto> {
        this.logger.log(`Creating product for organization ${organizationId}`);

        // I'm checking for a duplicate name within the same organization.
        const existingProduct = await this.productRepository.findByNameAndOrg(
            createDto.name,
            organizationId,
        );
        if (existingProduct) {
            throw new ConflictException(
                `Product with name "${createDto.name}" already exists in this organization.`,
            );
        }

        // I'm ensuring the provided category ID is valid and belongs to the organization.
        await this.productCategoryService.findOne(
            createDto.productCategoryId,
            organizationId,
        );

        // I'm performing validation specific to variable products.
        this._validateVariableProduct(createDto);

        const newProductData = {
            ...createDto,
            organizationId: new Types.ObjectId(organizationId),
            createdBy: new Types.ObjectId(userId),
            updatedBy: new Types.ObjectId(userId),
        };

        const createdProduct = await this.productRepository.create(newProductData);
        this.logger.log(`Successfully created product with ID ${createdProduct._id}`);

        return this._mapToResponseDto(createdProduct);
    }

    /**
     * Finds all products for a specific organization with pagination and filtering.
     * @param queryDto - The query parameters for filtering, sorting, and pagination.
     * @param organizationId - The ID of the organization.
     * @returns A paginated list of products.
     */
    async findAll(
        queryDto: FindAllProductsQueryDto,
        organizationId: string,
    ): Promise<PaginatedResponseDto<ProductResponseDto>> {
        this.logger.log(`Finding all products for organization ${organizationId}`);
        const paginatedResult = await this.productRepository.findAllByOrg(
            organizationId,
            queryDto,
        );

        // I'm mapping the raw data to the response DTO to ensure a clean and consistent API contract.
        const data = paginatedResult.data.map((product) =>
            this._mapToResponseDto(product),
        );

        return new PaginatedResponseDto({
            data,
            total: paginatedResult.total,
            currentPage: paginatedResult.page,
            totalPages: paginatedResult.pages,
        });
    }

    /**
     * Finds a single product by ID within a specific organization.
     * @param id - The ID of the product to find.
     * @param organizationId - The ID of the organization.
     * @returns The found product.
     * @throws NotFoundException if the product is not found.
     */
    async findOne(
        id: string,
        organizationId: string,
    ): Promise<ProductResponseDto> {
        this.logger.log(`Finding product with ID ${id} for organization ${organizationId}`);
        const product = await this.productRepository.findByIdAndOrg(id, organizationId);
        return this._mapToResponseDto(product);
    }

    /**
   * I've added this method to validate that a list of product IDs exist and belong to the specified organization.
   * This is a crucial utility for other services, like the DiscountService, that need to reference products.
   * It throws a BadRequestException if any of the IDs are invalid or not found.
   * @param productIds - An array of product IDs to validate.
   * @param organizationId - The ID of the organization to scope the check to.
   * @throws BadRequestException if any IDs are invalid or not found.
   */
    async validateProductIdsExist(
        productIds: string[],
        organizationId: string,
    ): Promise<void> {
        if (!productIds || productIds.length === 0) {
            return; // Nothing to validate, so we can exit early.
        }

        // I'm using a Set to efficiently handle any duplicate IDs passed in the array.
        const uniqueProductIds = new Set(productIds);
        const objectIdProductIds = [...uniqueProductIds].map(id => {
            if (!Types.ObjectId.isValid(id)) {
                throw new BadRequestException(`Invalid product ID format: ${id}`);
            }
            return new Types.ObjectId(id);
        });

        // I'm fetching only the _id field for an efficient query, as we only need to check for existence.
        // This assumes your ProductRepository has a `findAll` method similar to your other repositories.
        const foundProducts = await this.productRepository.findAll(
            {
                _id: { $in: objectIdProductIds },
                organizationId: new Types.ObjectId(organizationId),
                isDeleted: { $ne: true }, // Ensure we don't validate against soft-deleted products.
            },
            { _id: 1 }, // Projection to return only the _id.
        );

        // If the number of found products doesn't match the number of unique IDs, some are missing.
        if (foundProducts.length !== uniqueProductIds.size) {
            const foundIds = new Set(
                foundProducts.map(prod => prod._id.toString()),
            );
            const notFoundIds = [...uniqueProductIds].filter(
                id => !foundIds.has(id),
            );
            throw new BadRequestException(
                `The following product IDs were not found or do not belong to your organization: ${notFoundIds.join(', ')}`,
            );
        }
    }

    /**
     * Updates an existing product.
     * @param id - The ID of the product to update.
     * @param updateDto - The data to update.
     * @param organizationId - The ID of the organization.
     * @param userId - The ID of the user performing the update.
     * @returns The updated product.
     */
    async update(
        id: string,
        updateDto: UpdateProductDto,
        organizationId: string,
        userId: string,
    ): Promise<ProductResponseDto> {
        this.logger.log(`Updating product with ID ${id}`);

        // First, I ensure the product exists in the organization before attempting to update.
        const existingProduct = await this.productRepository.findByIdAndOrg(id, organizationId);

        // I'm preventing the product type from being changed after creation.
        if (updateDto.productType && updateDto.productType !== existingProduct.productType) {
            throw new BadRequestException('Cannot change the productType of an existing product.');
        }

        // If the name is being changed, I check for conflicts with other products.
        if (updateDto.name && updateDto.name !== existingProduct.name) {
            const conflictingProduct = await this.productRepository.findByNameAndOrg(
                updateDto.name,
                organizationId,
            );
            if (conflictingProduct && conflictingProduct._id.toString() !== id) {
                throw new ConflictException(
                    `Another product with name "${updateDto.name}" already exists.`,
                );
            }
        }

        // If the category is being changed, I validate the new category.
        if (updateDto.productCategoryId) {
            await this.productCategoryService.findOne(
                updateDto.productCategoryId,
                organizationId,
            );
        }

        // I'm re-validating the variations if they are part of the update.
        this._validateVariableProduct(updateDto);

        const updateData = {
            ...updateDto,
            updatedBy: new Types.ObjectId(userId),
        };

        const updatedProduct = await this.productRepository.update(id, updateData);
        this.logger.log(`Successfully updated product with ID ${id}`);
        return this._mapToResponseDto(updatedProduct);
    }

    /**
     * Soft-deletes a product by setting the isDeleted flag.
     * @param id - The ID of the product to delete.
     * @param organizationId - The ID of the organization.
     * @param userId - The ID of the user performing the deletion.
     */
    async remove(
        id: string,
        organizationId: string,
        userId: string,
    ): Promise<void> {
        this.logger.log(`Soft-deleting product with ID ${id}`);
        await this.productRepository.findByIdAndOrg(id, organizationId);

        const updateData = {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: new Types.ObjectId(userId),
        };

        await this.productRepository.update(id, updateData);
        this.logger.log(`Successfully soft-deleted product with ID ${id}`);
    }

}
