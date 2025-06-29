import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { BaseRepository } from 'src/database/base.repository';
import { FindAllCustomersQueryDto } from './dto/find-all-customers-query.dto';
import { CustomerDocument, Customer } from './entities/customer.entity';

@Injectable()
export class CustomerRepository extends BaseRepository<CustomerDocument> {
    protected readonly logger = new Logger(CustomerRepository.name);

    constructor(
        @InjectModel(Customer.name)
        private readonly customerModel: Model<CustomerDocument>,
    ) {
        super(customerModel);
    }

    /**
     * Finds, filters, sorts, and paginates customers for a specific organization.
     * This method builds a robust query from the DTO and ensures data isolation.
     * @param organizationId - The ID of the organization.
     * @param queryDto - The DTO containing pagination, sorting, and filter options.
     * @returns A paginated list of customers.
     */
    async findAllByOrg(
        organizationId: string,
        queryDto: FindAllCustomersQueryDto,
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
        const filter: FilterQuery<CustomerDocument> = {
            organizationId: new Types.ObjectId(organizationId),
        };

        // Conditionally add soft-delete filter if not including deleted items.
        if (!includeDeleted) {
            filter.isDeleted = { $ne: true };
        }

        // Add search functionality across multiple fields.
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
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
     * Finds a single customer by ID, ensuring it belongs to the correct organization.
     * @param id - The customer's ID.
     * @param organizationId - The ID of the organization.
     * @returns The found customer document.
     * @throws NotFoundException if the customer is not found in the specified organization.
     */
    async findByIdAndOrg(
        id: string,
        organizationId: string,
    ): Promise<CustomerDocument> {
        const filter: FilterQuery<CustomerDocument> = {
            _id: new Types.ObjectId(id),
            organizationId: new Types.ObjectId(organizationId),
            isDeleted: { $ne: true },
        };
        const customer = await this.findOne(filter);
        if (!customer) {
            throw new NotFoundException(
                `Customer with ID "${id}" not found in this organization.`,
            );
        }
        return customer;
    }

    /**
     * Finds a customer by email within a specific organization.
     * Useful for checking for duplicates before creation.
     * @param email - The customer's email.
     * @param organizationId - The ID of the organization.
     * @returns The customer document or null if not found.
     */
    async findByEmailAndOrg(
        email: string,
        organizationId: string,
    ): Promise<CustomerDocument | null> {
        return this.customerModel.findOne({
            email: email.toLowerCase(),
            organizationId: new Types.ObjectId(organizationId),
        });
    }

    /**
     * Atomically updates the due credit amount for a customer.
     * Using $inc is safer for concurrent operations than fetching and setting.
     * @param id - The customer's ID.
     * @param organizationId - The ID of the organization.
     * @param amount - The amount to add (can be negative to subtract).
     * @returns The updated customer document.
     */
    async updateDueCredit(
        id: string,
        organizationId: string,
        amount: number,
    ): Promise<CustomerDocument> {
        const customer = await this.customerModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id),
                organizationId: new Types.ObjectId(organizationId),
            },
            { $inc: { dueCreditAmount: amount } },
            { new: true },
        );

        if (!customer) {
            throw new NotFoundException(
                `Customer with ID "${id}" not found for credit update.`,
            );
        }
        return customer;
    }
}
