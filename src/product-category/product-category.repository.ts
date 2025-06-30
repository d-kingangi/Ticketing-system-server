import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { BaseRepository } from 'src/database/base.repository';
import { FindAllProductCategoriesQueryDto } from './dto/find-all-product-category-query.dto';
import { ProductCategoryDocument, ProductCategory } from './entities/product-category.entity';

@Injectable()
export class ProductCategoryRepository extends BaseRepository<ProductCategoryDocument> {
    protected readonly logger = new Logger(ProductCategoryRepository.name);

    constructor(
        @InjectModel(ProductCategory.name)
        private readonly productCategoryModel: Model<ProductCategoryDocument>,
    ) {
        super(productCategoryModel);
    }

    /**
     * Finds, filters, sorts, and paginates product categories for a specific organization.
     * This method builds a robust query from the DTO and ensures data isolation.
     * @param organizationId - The ID of the organization.
     * @param queryDto - The DTO containing pagination, sorting, and filter options.
     * @returns A paginated list of product categories.
     */
    async findAllByOrg(
        organizationId: string,
        queryDto: FindAllProductCategoriesQueryDto,
    ) {
        const {
            page,
            limit,
            sortBy,
            sortDirection,
            search,
            isActive,
            includeDeleted,
        } = queryDto;

        // I've created a filter object that always scopes queries to the organization.
        const filter: FilterQuery<ProductCategoryDocument> = {
            organizationId: new Types.ObjectId(organizationId),
        };

        // Conditionally add soft-delete filter if not including deleted items.
        if (!includeDeleted) {
            filter.isDeleted = { $ne: true };
        }

        // Add search functionality on the 'name' field.
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        // Filter by active status if provided.
        if (typeof isActive === 'boolean') {
            filter.isActive = isActive;
        }

        // I've defined the sort order based on the query parameters.
        const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

        return this.findWithPagination(filter, page, limit, sort);
    }

    /**
     * Finds a single product category by ID, ensuring it belongs to the correct organization.
     * @param id - The category's ID.
     * @param organizationId - The ID of the organization.
     * @returns The found product category document.
     * @throws NotFoundException if the category is not found in the specified organization.
     */
    async findByIdAndOrg(
        id: string,
        organizationId: string,
    ): Promise<ProductCategoryDocument> {
        const filter: FilterQuery<ProductCategoryDocument> = {
            _id: new Types.ObjectId(id),
            organizationId: new Types.ObjectId(organizationId),
            isDeleted: { $ne: true },
        };
        const category = await this.findOne(filter);
        if (!category) {
            throw new NotFoundException(
                `Product category with ID "${id}" not found in this organization.`,
            );
        }
        return category;
    }

    /**
     * Finds a product category by name within a specific organization.
     * Useful for checking for duplicates before creation.
     * @param name - The category's name.
     * @param organizationId - The ID of the organization.
     * @returns The category document or null if not found.
     */
    async findByNameAndOrg(
        name: string,
        organizationId: string,
    ): Promise<ProductCategoryDocument | null> {
        return this.productCategoryModel.findOne({
            name,
            organizationId: new Types.ObjectId(organizationId),
        });
    }
}
