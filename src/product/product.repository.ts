import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { FindAllProductsQueryDto } from './dto/find-all-products-query.dto';
import { Product, ProductDocument } from './entities/product.entity';
import { ProductType } from './interfaces/product.interfaces';

@Injectable()
export class ProductRepository extends BaseRepository<ProductDocument> {
    protected readonly logger = new Logger(ProductRepository.name);

    constructor(
        @InjectModel(Product.name)
        private readonly productModel: Model<ProductDocument>,
    ) {
        super(productModel);
    }

    /**
    * I've implemented this method to find, filter, sort, and paginate products for a specific organization.
    * It builds a robust query from the DTO and ensures data isolation by always filtering by organizationId.
    * @param organizationId - The ID of the organization.
    * @param queryDto - The DTO containing pagination, sorting, and filter options.
    * @returns A paginated list of products.
    */
    async findAllByOrg(
        organizationId: string,
        queryDto: FindAllProductsQueryDto,
    ) {
        const {
            page,
            limit,
            sortBy,
            sortDirection,
            search,
            isActive,
            includeDeleted,
            productCategoryId,
            productType,
            onSale,
        } = queryDto;

        // I've created a filter object that always scopes queries to the organization.
        const filter: FilterQuery<ProductDocument> = {
            organizationId: new Types.ObjectId(organizationId),
        };

        // Conditionally add soft-delete filter if not including deleted items.
        if (!includeDeleted) {
            filter.isDeleted = { $ne: true };
        }

        // Filter by active status if provided.
        if (typeof isActive === 'boolean') {
            filter.isActive = isActive;
        }

        // Filter by product category if provided.
        if (productCategoryId) {
            filter.productCategoryId = new Types.ObjectId(productCategoryId);
        }

        // Filter by product type if provided.
        if (productType) {
            filter.productType = productType;
        }

        // I'm adding search functionality. It checks the product name, the SKU of simple products,
        // and the SKUs of all variations within variable products.
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            filter.$or = [
                { name: searchRegex },
                { sku: searchRegex }, // For simple products
                { 'variations.sku': searchRegex }, // For variable products
            ];
        }

        // I've added logic to filter by products that are currently on sale.
        if (onSale === true) {
            const now = new Date();
            // This complex filter checks for an active sale on either a simple product
            // or at least one of its variations.
            const saleConditions = [
                // --- Start of fix: I've wrapped the date conditions in an $and operator.
                // An object cannot have two properties with the same name (e.g., two '$or' keys).
                // The $and operator correctly ensures both start and end date conditions are met.
                {
                    productType: ProductType.SIMPLE,
                    salePrice: { $exists: true, $ne: null },
                    $and: [
                        {
                            $or: [
                                { saleStartDate: { $exists: false } },
                                { saleStartDate: { $lte: now } },
                            ],
                        },
                        {
                            $or: [
                                { saleEndDate: { $exists: false } },
                                { saleEndDate: { $gte: now } },
                            ],
                        },
                    ],
                },
                // Condition for variable products with at least one variation on sale (this was already correct).
                {
                    productType: ProductType.VARIABLE,
                    variations: {
                        $elemMatch: {
                            salePrice: { $exists: true, $ne: null },
                            $and: [
                                { $or: [{ saleStartDate: { $lte: now } }, { saleStartDate: { $exists: false } }] },
                                { $or: [{ saleEndDate: { $gte: now } }, { saleEndDate: { $exists: false } }] },
                            ],
                        },
                    },
                },
            ];

            // If a search term is also present, combine it with the sale conditions.
            // Otherwise, just use the sale conditions.
            if (filter.$or) {
                filter.$and = [
                    { $or: filter.$or },
                    { $or: saleConditions },
                ];
                delete filter.$or;
            } else {
                filter.$or = saleConditions;
            }
        }

        // I've defined the sort order based on the query parameters.
        const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

        return this.findWithPagination(filter, page, limit, sort);
    }

    /**
     * I've implemented this method to find a single product by its ID, ensuring it belongs to the correct organization.
     * This is a critical security and data-integrity measure.
     * @param id - The product's ID.
     * @param organizationId - The ID of the organization.
     * @returns The found product document.
     * @throws NotFoundException if the product is not found in the specified organization.
     */
    async findByIdAndOrg(
        id: string,
        organizationId: string,
    ): Promise<ProductDocument> {
        const filter: FilterQuery<ProductDocument> = {
            _id: new Types.ObjectId(id),
            organizationId: new Types.ObjectId(organizationId),
        };
        const product = await this.findOne(filter);
        if (!product) {
            throw new NotFoundException(
                `Product with ID "${id}" not found in this organization.`,
            );
        }
        return product;
    }

    /**
     * I've implemented this method to find a product by name within a specific organization.
     * It's useful for checking for duplicates before creating or updating a product.
     * @param name - The product's name (case-insensitive).
     * @param organizationId - The ID of the organization.
     * @returns The product document or null if not found.
     */
    async findByNameAndOrg(
        name: string,
        organizationId: string,
    ): Promise<ProductDocument | null> {
        return this.productModel.findOne({
            name: { $regex: `^${name}$`, $options: 'i' }, // Case-insensitive exact match
            organizationId: new Types.ObjectId(organizationId),
        }).exec();
    }
}
