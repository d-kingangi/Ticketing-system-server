import {
    Injectable,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerDocument } from './entities/customer.entity';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { FindAllCustomersQueryDto } from './dto/find-all-customers-query.dto';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { CustomerRepository } from './customer.repository';

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);

    constructor(private readonly customerRepository: CustomerRepository) {}

    private _mapToResponseDto(customer: CustomerDocument): CustomerResponseDto {
        return {
            // --- Start of change: I've converted the Mongoose ObjectId to a string for the response.
            id: customer._id.toHexString(),
            // --- End of change
            organizationId: customer.organizationId.toHexString(),
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            creditLimit: customer.creditLimit,
            dueCreditAmount: customer.dueCreditAmount,
            isActive: customer.isActive,
            notes: customer.notes,
            registeredBy: customer.registeredBy.toHexString(),
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        };
    }

    async create(
        createCustomerDto: CreateCustomerDto,
        organizationId: string,
        userId: string,
    ): Promise<CustomerResponseDto> {
        this.logger.log(`Creating customer for organization ${organizationId}`);

        const existingCustomer = await this.customerRepository.findByEmailAndOrg(
            createCustomerDto.email,
            organizationId,
        );

        if (existingCustomer) {
            throw new ConflictException(
                `Customer with email "${createCustomerDto.email}" already exists in this organization.`,
            );
        }

        const newCustomerData = {
            ...createCustomerDto,
            organizationId: new Types.ObjectId(organizationId),
            registeredBy: new Types.ObjectId(userId),
            createdBy: new Types.ObjectId(userId),
        };

        const createdCustomer = await this.customerRepository.create(newCustomerData);
        this.logger.log(`Successfully created customer with ID ${createdCustomer._id}`);

        return this._mapToResponseDto(createdCustomer);
    }

    async findAll(
        queryDto: FindAllCustomersQueryDto,
        organizationId: string,
    ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
        this.logger.log(`Finding all customers for organization ${organizationId}`);
        const paginatedResult = await this.customerRepository.findAllByOrg(
            organizationId,
            queryDto,
        );

        const data = paginatedResult.data.map((customer) => this._mapToResponseDto(customer));

        // --- Start of change: I'm now returning a proper instance of PaginatedResponseDto with correctly mapped fields.
        return new PaginatedResponseDto({
            data,
            total: paginatedResult.total,
            currentPage: paginatedResult.page,
            totalPages: paginatedResult.pages,
        });
        // --- End of change
    }

    async findOne(id: string, organizationId: string): Promise<CustomerResponseDto> {
        this.logger.log(`Finding customer with ID ${id} for organization ${organizationId}`);
        const customer = await this.customerRepository.findByIdAndOrg(id, organizationId);
        return this._mapToResponseDto(customer);
    }

    async update(
        id: string,
        updateCustomerDto: UpdateCustomerDto,
        organizationId: string,
        userId: string,
    ): Promise<CustomerResponseDto> {
        this.logger.log(`Updating customer with ID ${id}`);

        await this.customerRepository.findByIdAndOrg(id, organizationId);

        if (updateCustomerDto.email) {
            const existingCustomer = await this.customerRepository.findByEmailAndOrg(
                updateCustomerDto.email,
                organizationId,
            );
            // --- Start of change: I've corrected the comparison to compare two strings, preventing a potential bug.
            if (existingCustomer && existingCustomer._id.toHexString() !== id) {
            // --- End of change
                throw new ConflictException(
                    `Another customer with email "${updateCustomerDto.email}" already exists.`,
                );
            }
        }

        const updateData = {
            ...updateCustomerDto,
            updatedBy: new Types.ObjectId(userId),
        };

        const updatedCustomer = await this.customerRepository.update(id, updateData);
        this.logger.log(`Successfully updated customer with ID ${id}`);
        return this._mapToResponseDto(updatedCustomer);
    }

    async remove(id: string, organizationId: string, userId: string): Promise<void> {
        this.logger.log(`Soft-deleting customer with ID ${id}`);

        await this.customerRepository.findByIdAndOrg(id, organizationId);

        const updateData = {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: new Types.ObjectId(userId),
        };

        await this.customerRepository.update(id, updateData);
        this.logger.log(`Successfully soft-deleted customer with ID ${id}`);
    }
}
