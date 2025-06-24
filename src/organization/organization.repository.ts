import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { Organization, OrganizationDocument } from './entities/organization.entity';

/**
 * Repository for the Organization collection.
 * Extends the generic BaseRepository and includes methods
 * specific to organization data access logic.
 */
@Injectable()
export class OrganizationRepository extends BaseRepository<OrganizationDocument> {
  constructor(
    // Inject the Mongoose model for the 'Organization' document.
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    super(organizationModel);
  }

  /**
   * Finds a single organization by its unique organization code.
   * @param orgCode The unique code of the organization.
   * @returns The organization document or null if not found.
   */
  async findByOrgCode(orgCode: string): Promise<OrganizationDocument | null> {
    return this.model.findOne({ org_code: orgCode }).exec();
  }

  /**
   * Finds a single organization by its unique email address.
   * @param email The unique email of the organization.
   * @returns The organization document or null if not found.
   */
  async findByEmail(email: string): Promise<OrganizationDocument | null> {
    return this.model.findOne({ email }).exec();
  }

  /**
   * Finds all organizations owned by a specific user.
   * @param ownerId The ID of the owner user.
   * @returns An array of organization documents.
   */
  async findByOwnerId(ownerId: string): Promise<OrganizationDocument[]> {
    return this.model.find({ ownerId }).exec();
  }

  /**
   * Soft-deletes an organization by setting its isDeleted flag to true
   * and isActive to false.
   * @param organizationId The ID of the organization to soft-delete.
   * @param updatedBy The ID of the user performing the action.
   * @returns The updated organization document, or null if not found.
   */
  async softDelete(
    organizationId: string,
    updatedBy: string,
  ): Promise<OrganizationDocument | null> {
    const update: UpdateQuery<OrganizationDocument> = {
      $set: {
        isDeleted: true,
        isActive: false, // Also deactivate the organization upon soft deletion.
        updatedBy: updatedBy,
      },
    };
    return this.model.findByIdAndUpdate(organizationId, update, { new: true }).exec();
  }

  /**
   * Restores a soft-deleted organization by setting its isDeleted flag to false
   * and isActive to true.
   * @param organizationId The ID of the organization to restore.
   * @param updatedBy The ID of the user performing the action.
   * @returns The restored organization document, or null if not found.
   */
  async restore(
    organizationId: string,
    updatedBy: string,
  ): Promise<OrganizationDocument | null> {
    const update: UpdateQuery<OrganizationDocument> = {
      $set: {
        isDeleted: false,
        isActive: true, // Reactivate the organization upon restoration.
        updatedBy: updatedBy,
      },
    };
    return this.model.findByIdAndUpdate(organizationId, update, { new: true }).exec();
  }

  /**
   * Adds a user's ID to the organization's list of associated users.
   * Uses $addToSet to prevent duplicate entries.
   * @param organizationId The ID of the organization.
   * @param userId The ID of the user to add.
   * @returns The updated organization document.
   */
  async addUserToOrganization(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationDocument | null> {
    const update: UpdateQuery<OrganizationDocument> = {
      $addToSet: {
        users: userId,
      },
    };
    return this.model.findByIdAndUpdate(organizationId, update, { new: true }).exec();
  }

  /**
   * Removes a user's ID from the organization's list of associated users.
   * @param organizationId The ID of the organization.
   * @param userId The ID of the user to remove.
   * @returns The updated organization document.
   */
  async removeUserFromOrganization(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationDocument | null> {
    const update: UpdateQuery<OrganizationDocument> = {
      $pull: {
        users: userId,
      },
    };
    return this.model.findByIdAndUpdate(organizationId, update, { new: true }).exec();
  }
}
