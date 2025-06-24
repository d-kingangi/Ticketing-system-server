import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationRepository } from './organization.repository';
import { OrganizationDocument } from './entities/organization.entity';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto'; // Assuming this DTO exists
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { FindAllOrganizationsQueryDto } from './dto/find-all-organization.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Maps an OrganizationDocument to an OrganizationResponseDto.
   * @param organization The organization document to map.
   * @returns The mapped organization response DTO.
   */
  private mapToResponseDto(
    organization: OrganizationDocument,
  ): OrganizationResponseDto {
    if (!organization) {
      return null;
    }
    return {
      id: organization._id.toString(),
      name: organization.name,
      org_code: organization.org_code,
      logoUrl: organization.logoUrl,
      kraPin: organization.kraPin,
      phone: organization.phone,
      email: organization.email,
      address: organization.address,
      websiteUrl: organization.websiteUrl,
      primaryContact: organization.primaryContact,
      status: organization.status,
      isActive: organization.isActive,
      expiry_date: organization.expiry_date,
      location: organization.location,
      hasStkPush: organization.hasStkPush,
      stkPushApiId: organization.stkPushApiId,
      bankPaymentDetails: organization.bankPaymentDetails,
      mpesaPaymentDetails: organization.mpesaPaymentDetails,
      ownerId: organization.ownerId.toHexString(),
      users: organization.users.map(userId => userId.toHexString()),
      isDeleted: organization.isDeleted,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      updatedBy: organization.updatedBy,
    };
  }

  /**
   * Creates a new organization.
   * @param createOrganizationDto DTO containing organization creation data.
   * @returns The created organization.
   * @throws ConflictException if an organization with the same org_code or email already exists.
   */
  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(
      `Attempting to create organization: ${createOrganizationDto.name}`,
    );

    // Check for existing organization with the same org_code
    const existingOrgCode = await this.organizationRepository.findByOrgCode(
      createOrganizationDto.org_code,
    );
    if (existingOrgCode) {
      this.logger.warn(
        `Organization with org_code "${createOrganizationDto.org_code}" already exists`,
      );
      throw new ConflictException(
        `Organization with org_code "${createOrganizationDto.org_code}" already exists`,
      );
    }

    // Check for existing organization with the same email
    if (createOrganizationDto.email) {
      const existingEmail = await this.organizationRepository.findByEmail(
        createOrganizationDto.email,
      );
      if (existingEmail) {
        this.logger.warn(
          `Organization with email "${createOrganizationDto.email}" already exists`,
        );
        throw new ConflictException(
          `Organization with email "${createOrganizationDto.email}" already exists`,
        );
      }
    }

    try {
      const newOrganization = await this.organizationRepository.create({
        ...createOrganizationDto,
        ownerId: new Types.ObjectId(createOrganizationDto.ownerId), // Convert ownerId to ObjectId
      });
      this.logger.log(
        `Successfully created organization with ID: ${newOrganization._id}`,
      );
      return this.mapToResponseDto(newOrganization);
    } catch (error) {
      this.logger.error(
        `Failed to create organization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds all organizations with pagination and filtering.
   * @param queryDto DTO containing pagination, filtering, and sorting options.
   * @returns A paginated list of organizations.
   */
  async findAll(
    queryDto: FindAllOrganizationsQueryDto,
  ): Promise<PaginatedResponseDto<OrganizationResponseDto>> {
    this.logger.log(`Fetching all organizations with query: ${JSON.stringify(queryDto)}`);

    const { page, limit, name, status, sortBy, sortDirection, includeDeleted } = queryDto;

    const filter: any = {};
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    if (status) {
      filter.status = status;
    }
    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    try {
      const result = await this.organizationRepository.findWithPagination(
        filter,
        page,
        limit,
        sort,
      );

      return new PaginatedResponseDto<OrganizationResponseDto>({
        data: result.data.map((org) => this.mapToResponseDto(org)),
        total: result.total,
        currentPage: result.page,
        totalPages: result.pages,
      });
    } catch (error) {
      this.logger.error(
        `Failed to find all organizations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a single organization by its ID.
   * @param id The ID of the organization.
   * @returns The found organization.
   * @throws NotFoundException if the organization is not found.
   */
  async findOne(id: string): Promise<OrganizationResponseDto> {
    this.logger.log(`Fetching organization with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID format.');
    }

    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      this.logger.warn(`Organization with ID: ${id} not found`);
      throw new NotFoundException(`Organization with ID "${id}" not found.`);
    }
    return this.mapToResponseDto(organization);
  }

  /**
   * Updates an existing organization.
   * @param id The ID of the organization to update.
   * @param updateOrganizationDto DTO containing organization update data.
   * @param updatedBy The ID of the user performing the update.
   * @returns The updated organization.
   * @throws NotFoundException if the organization is not found.
   * @throws ConflictException if updating the email to one that already exists.
   */
  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    updatedBy: string,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(
      `Attempting to update organization with ID: ${id} by user ${updatedBy}`,
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID format.');
    }

    // First, ensure the organization exists and is not deleted
    const existingOrganization = await this.organizationRepository.findById(id);

    if (!existingOrganization || existingOrganization.isDeleted) {
      this.logger.warn(
        `Organization with ID: ${id} not found for update or has been deleted`,
      );
      throw new NotFoundException(
        `Organization with ID "${id}" not found or has been deleted.`,
      );
    }

    // If email is being updated, check for uniqueness
    if (
      updateOrganizationDto.email &&
      updateOrganizationDto.email !== existingOrganization.email
    ) {
      const organizationWithSameEmail =
        await this.organizationRepository.findByEmail(
          updateOrganizationDto.email,
        );
      if (
        organizationWithSameEmail &&
        organizationWithSameEmail._id.toString() !== id
      ) {
        this.logger.warn(
          `Update failed: Organization email "${updateOrganizationDto.email}" already exists`,
        );
        throw new ConflictException(
          `Organization with email "${updateOrganizationDto.email}" already exists.`,
        );
      }
    }

    try {
      // Add updatedBy to the DTO for the repository
      const updateData = { ...updateOrganizationDto, updatedBy };

      const updatedOrganization = await this.organizationRepository.update(
        id,
        updateData, // Mongoose UpdateQuery
      );

      if (!updatedOrganization) {
        // This case might occur if the item was deleted between the find and update
        this.logger.warn(
          `Organization with ID: ${id} not found during update operation`,
        );
        throw new NotFoundException(
          `Organization with ID "${id}" could not be updated (possibly deleted).`,
        );
      }
      this.logger.log(
        `Successfully updated organization with ID: ${id} by user ${updatedBy}`,
      );
      return this.mapToResponseDto(updatedOrganization);
    } catch (error) {
      this.logger.error(
        `Failed to update organization ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Soft deletes an organization.
   * @param id The ID of the organization to soft delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns A success message.
   * @throws NotFoundException if the organization is not found or already soft-deleted.
   */
  async softRemove(
    id: string,
    updatedBy: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Attempting to soft delete organization with ID: ${id} by user ${updatedBy}`,
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID format.');
    }

    const deletedOrganization =
      await this.organizationRepository.softDelete(
        id,
        updatedBy,
      );

    if (!deletedOrganization) {
      this.logger.warn(
        `Organization with ID: ${id} not found or already soft-deleted`,
      );
      throw new NotFoundException(
        `Organization with ID "${id}" not found or already soft-deleted.`,
      );
    }
    this.logger.log(
      `Successfully soft-deleted organization with ID: ${id} by user ${updatedBy}`,
    );
    return { message: `Organization with ID "${id}" successfully soft-deleted.` };
  }

  /**
   * Restores a soft-deleted organization.
   * @param id The ID of the organization to restore.
   * @param updatedBy The ID of the user performing the action.
   * @returns The restored organization.
   * @throws NotFoundException if the organization is not found or not soft-deleted.
   */
  async restore(
    id: string,
    updatedBy: string,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(
      `Attempting to restore organization with ID: ${id} by user ${updatedBy}`,
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID format.');
    }

    const restoredOrganization =
      await this.organizationRepository.restore(
        id,
        updatedBy,
      );

    if (!restoredOrganization) {
      this.logger.warn(
        `Organization with ID: ${id} not found or not in a soft-deleted state`,
      );
      throw new NotFoundException(
        `Organization with ID "${id}" not found or is not in a soft-deleted state.`,
      );
    }
    this.logger.log(
      `Successfully restored organization with ID: ${id} by user ${updatedBy}`,
    );
    return this.mapToResponseDto(restoredOrganization);
  }

  /**
   * Permanently deletes an organization. Use with caution.
   * @param id The ID of the organization to permanently delete.
   * @returns A success message.
   * @throws NotFoundException if the organization is not found.
   */
  async hardRemove(
    id: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Attempting to permanently delete organization with ID: ${id}`,
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid organization ID format.');
    }

    const deletedOrganization =
      await this.organizationRepository.delete(
        id,
      );

    if (!deletedOrganization) {
      this.logger.warn(
        `Organization with ID: ${id} not found for permanent deletion`,
      );
      throw new NotFoundException(
        `Organization with ID "${id}" not found.`,
      );
    }
    this.logger.log(
      `Successfully permanently deleted organization with ID: ${id}`,
    );
    return {
      message: `Organization with ID "${id}" successfully permanently deleted.`,
    };
  }

  /**
   * Adds a user to an organization.
   * @param organizationId The ID of the organization.
   * @param userId The ID of the user to add.
   * @returns The updated organization.
   * @throws NotFoundException if the organization is not found.
   */
  async addUserToOrganization(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(
      `Attempting to add user ${userId} to organization ${organizationId}`,
    );
    if (!Types.ObjectId.isValid(organizationId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID format.');
    }

    const updatedOrganization =
      await this.organizationRepository.addUserToOrganization(
        organizationId,
        userId,
      );

    if (!updatedOrganization) {
      this.logger.warn(
        `Organization with ID: ${organizationId} not found when adding user`,
      );
      throw new NotFoundException(
        `Organization with ID "${organizationId}" not found.`,
      );
    }
    this.logger.log(
      `Successfully added user ${userId} to organization ${organizationId}`,
    );
    return this.mapToResponseDto(updatedOrganization);
  }

  /**
   * Removes a user from an organization.
   * @param organizationId The ID of the organization.
   * @param userId The ID of the user to remove.
   * @returns The updated organization.
   * @throws NotFoundException if the organization is not found.
   */
  async removeUserFromOrganization(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(
      `Attempting to remove user ${userId} from organization ${organizationId}`,
    );
    if (!Types.ObjectId.isValid(organizationId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID format.');
    }

    const updatedOrganization =
      await this.organizationRepository.removeUserFromOrganization(
        organizationId,
        userId,
      );

    if (!updatedOrganization) {
      this.logger.warn(
        `Organization with ID: ${organizationId} not found when removing user`,
      );
      throw new NotFoundException(
        `Organization with ID "${organizationId}" not found.`,
      );
    }
    this.logger.log(
      `Successfully removed user ${userId} from organization ${organizationId}`,
    );
    return this.mapToResponseDto(updatedOrganization);
  }

  /**
   * Finds organizations owned by a specific user.
   * @param ownerId The ID of the owner.
   * @returns An array of organizations.
   */
  async findByOwnerId(ownerId: string): Promise<OrganizationResponseDto[]> {
    this.logger.log(`Fetching organizations owned by user: ${ownerId}`);
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid user ID format.');
    }

    const organizations = await this.organizationRepository.findByOwnerId(ownerId);
    return organizations.map(org => this.mapToResponseDto(org));
  }
}
