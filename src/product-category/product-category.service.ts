import {
    Injectable,
    ConflictException,
    NotFoundException,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryDocument } from './entities/product-category.entity';
import { ProductCategoryResponseDto } from './dto/product-category-response.dto';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { FindAllProductCategoriesQueryDto } from './dto/find-all-product-category-query.dto';
import { ProductCategoryRepository } from './product-category.repository';

@Injectable()
export class ProductCategoryService {
    private readonly logger = new Logger(ProductCategoryService.name);

    constructor(
        private readonly productCategoryRepository: ProductCategoryRepository,
    ) { }

    /**
     * I've created a private helper method to map a database document to a response DTO.
     * This ensures a consistent response structure and avoids code duplication.
     * @param category - The product category document from the database.
     * @returns A DTO suitable for API responses.
     */
    private _mapToResponseDto(
        category: ProductCategoryDocument,
    ): ProductCategoryResponseDto {
        return {
            id: category._id.toString(),
            organizationId: category.organizationId.toHexString(),
            name: category.name,
            description: category.description,
            isActive: category.isActive,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        };
    }

    /**
     * Creates a new product category for a specific organization.
     * @param createDto - The data for the new product category.
     * @param organizationId - The ID of the organization the category belongs to.
     * @param userId - The ID of the user creating the category.
     * @returns The newly created product category.
     * @throws ConflictException if a category with the same name already exists in the organization.
     */
    async create(
        createDto: CreateProductCategoryDto,
        organizationId: string,
        userId: string,
    ): Promise<ProductCategoryResponseDto> {
        this.logger.log(
            `Creating product category for organization ${organizationId}`,
        );

        // I'm checking for a duplicate name within the same organization to maintain data integrity.
        const existingCategory =
            await this.productCategoryRepository.findByNameAndOrg(
                createDto.name,
                organizationId,
            );

        if (existingCategory) {
            throw new ConflictException(
                `Product category with name "${createDto.name}" already exists in this organization.`,
            );
        }

        const newCategoryData = {
            ...createDto,
            organizationId: new Types.ObjectId(organizationId),
            createdBy: new Types.ObjectId(userId), // From BaseDocument
        };

        const createdCategory =
            await this.productCategoryRepository.create(newCategoryData);
        this.logger.log(
            `Successfully created product category with ID ${createdCategory._id}`,
        );

        return this._mapToResponseDto(createdCategory);
    }

    /**
     * Finds all product categories for a specific organization with pagination and filtering.
     * @param queryDto - The query parameters for filtering, sorting, and pagination.
     * @param organizationId - The ID of the organization.
     * @returns A paginated list of product categories.
     */
    async findAll(
        queryDto: FindAllProductCategoriesQueryDto,
        organizationId: string,
    ): Promise<PaginatedResponseDto<ProductCategoryResponseDto>> {
        this.logger.log(
            `Finding all product categories for organization ${organizationId}`,
        );
        const paginatedResult =
            await this.productCategoryRepository.findAllByOrg(
                organizationId,
                queryDto,
            );

        // I'm mapping the raw data to the response DTO to ensure a clean API contract.
        const data = paginatedResult.data.map((category) =>
            this._mapToResponseDto(category),
        );

        return new PaginatedResponseDto({
            data,
            total: paginatedResult.total,
            currentPage: paginatedResult.page,
            totalPages: paginatedResult.pages,
        });
    }

    /**
     * Finds a single product category by ID within a specific organization.
     * @param id - The ID of the category to find.
     * @param organizationId - The ID of the organization.
     * @returns The found product category.
     * @throws NotFoundException if the category is not found.
     */
    async findOne(
        id: string,
        organizationId: string,
    ): Promise<ProductCategoryResponseDto> {
        this.logger.log(
            `Finding product category with ID ${id} for organization ${organizationId}`,
        );
        const category = await this.productCategoryRepository.findByIdAndOrg(
            id,
            organizationId,
        );
        return this._mapToResponseDto(category);
    }

    /**
     * I've added this method to validate that a list of category IDs exist and belong to the specified organization.
     * This is a crucial utility for other services, like the DiscountService, that need to reference product categories.
     * It throws a BadRequestException if any of the IDs are invalid or not found.
     * @param categoryIds - An array of product category IDs to validate.
     * @param organizationId - The ID of the organization to scope the check to.
     * @throws BadRequestException if any IDs are invalid or not found.
     */
    async validateCategoryIdsExist(
        categoryIds: string[],
        organizationId: string,
    ): Promise<void> {
        if (!categoryIds || categoryIds.length === 0) {
            return; // Nothing to validate, so we can exit early.
        }

        // I'm using a Set to efficiently handle any duplicate IDs passed in the array.
        const uniqueCategoryIds = new Set(categoryIds);
        const objectIdCategoryIds = [...uniqueCategoryIds].map(id => {
            if (!Types.ObjectId.isValid(id)) {
                throw new BadRequestException(`Invalid category ID format: ${id}`);
            }
            return new Types.ObjectId(id);
        });

        // I'm fetching only the _id field for an efficient query, as we only need to check for existence.
        const foundCategories = await this.productCategoryRepository.findAll(
            {
                _id: { $in: objectIdCategoryIds },
                organizationId: new Types.ObjectId(organizationId),
                isDeleted: { $ne: true }, // Ensure we don't validate against soft-deleted categories.
            },
            { _id: 1 }, // Projection to return only the _id.
        );

        // If the number of found categories doesn't match the number of unique IDs, some are missing.
        if (foundCategories.length !== uniqueCategoryIds.size) {
            const foundIds = new Set(
                foundCategories.map(cat => cat._id.toString()),
            );
            const notFoundIds = [...uniqueCategoryIds].filter(
                id => !foundIds.has(id),
            );
            throw new BadRequestException(
                `The following product category IDs were not found or do not belong to your organization: ${notFoundIds.join(', ')}`,
            );
        }
    }

    /**
     * Updates an existing product category.
     * @param id - The ID of the category to update.
     * @param updateDto - The data to update.
     * @param organizationId - The ID of the organization.
     * @param userId - The ID of the user performing the update.
     * @returns The updated product category.
     */
    async update(
        id: string,
        updateDto: UpdateProductCategoryDto,
        organizationId: string,
        userId: string,
    ): Promise<ProductCategoryResponseDto> {
        this.logger.log(`Updating product category with ID ${id}`);

        // First, I ensure the category exists in the organization before updating.
        await this.productCategoryRepository.findByIdAndOrg(id, organizationId);

        // If the name is being changed, I check for conflicts with other categories.
        if (updateDto.name) {
            const existingCategory =
                await this.productCategoryRepository.findByNameAndOrg(
                    updateDto.name,
                    organizationId,
                );
            if (existingCategory && existingCategory._id.toString() !== id) {
                throw new ConflictException(
                    `Another product category with name "${updateDto.name}" already exists.`,
                );
            }
        }

        const updateData = {
            ...updateDto,
            updatedBy: new Types.ObjectId(userId), // From BaseDocument
        };

        const updatedCategory = await this.productCategoryRepository.update(
            id,
            updateData,
        );
        this.logger.log(`Successfully updated product category with ID ${id}`);
        return this._mapToResponseDto(updatedCategory);
    }

    /**
     * Soft-deletes a product category by setting the isDeleted flag.
     * @param id - The ID of the category to delete.
     * @param organizationId - The ID of the organization.
     * @param userId - The ID of the user performing the deletion.
     */
    async remove(
        id: string,
        organizationId: string,
        userId: string,
    ): Promise<void> {
        this.logger.log(`Soft-deleting product category with ID ${id}`);

        // I'm ensuring the category exists before attempting to delete.
        await this.productCategoryRepository.findByIdAndOrg(id, organizationId);

        const updateData = {
            isDeleted: true,
            deletedAt: new Date(), // From BaseDocument
            deletedBy: new Types.ObjectId(userId), // From BaseDocument
        };

        await this.productCategoryRepository.update(id, updateData);
        this.logger.log(`Successfully soft-deleted product category with ID ${id}`);
    }
}
