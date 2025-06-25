import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery, Types } from 'mongoose';
import { BaseRepository } from '../database/base.repository'; // Import your BaseRepository
import { User, UserDocument, UserRole } from '../auth/schema/user.schema'; // Import User schema and document type

/**
 * Repository for the User collection.
 * Extends the generic BaseRepository and includes methods
 * specific to user data access logic.
 */
@Injectable()
export class UserRepository extends BaseRepository<UserDocument> {
  constructor(
    // Inject the Mongoose model for the 'User' document.
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    // Pass the injected model to the parent BaseRepository constructor.
    super(userModel);
  }

  /**
   * Finds a single user by their email address.
   * This is crucial for authentication and uniqueness checks.
   * @param email The email address of the user.
   * @param includeDeleted Optional: Whether to include soft-deleted users.
   * @returns The user document, or null if not found.
   */
  async findByEmail(email: string, includeDeleted: boolean = false): Promise<UserDocument | null> {
    const filter: FilterQuery<UserDocument> = { email: email.toLowerCase() };
    if (!includeDeleted) {
      filter.isDeleted = false;
    }
    // Use the generic findOne from BaseRepository
    return this.findOne(filter);
  }

  /**
   * Finds users by their assigned roles.
   * @param roles An array of UserRole enums to filter by.
   * @param includeDeleted Optional: Whether to include soft-deleted users.
   * @returns An array of user documents.
   */
  async findByRoles(roles: UserRole[], includeDeleted: boolean = false): Promise<UserDocument[]> {
    const filter: FilterQuery<UserDocument> = { roles: { $in: roles } };
    if (!includeDeleted) {
      filter.isDeleted = false;
    }
    // Use the generic findAll from BaseRepository
    return this.findAll(filter);
  }

  /**
   * Finds a user by their email verification token.
   * @param token The verification token.
   * @returns The user document, or null if not found.
   */
  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    // Ensure the token is not expired and the user is not already verified.
    return this.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
      isVerified: false,
      isDeleted: false,
    });
  }

  /**
   * Finds a user by their password reset token.
   * @param token The password reset token.
   * @returns The user document, or null if not found.
   */
  async findByResetPasswordToken(token: string): Promise<UserDocument | null> {
    // Ensure the token is not expired.
    return this.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
      isDeleted: false,
    });
  }

  /**
   * Soft-deletes a user by setting `isDeleted` to true and `deletedAt` to the current date.
   * @param id The ID of the user to soft-delete.
   * @returns The updated user document, or null if not found.
   */
  async softDelete(id: string): Promise<UserDocument | null> {
    const update: UpdateQuery<UserDocument> = {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false, // Typically, a soft-deleted user is also inactive
      },
    };
    // Use the generic update method from BaseRepository
    return this.update(id, update);
  }

  /**
   * Restores a soft-deleted user by setting `isDeleted` to false and `deletedAt` to null.
   * @param id The ID of the user to restore.
   * @returns The updated user document, or null if not found.
   */
  async restore(id: string): Promise<UserDocument | null> {
    const update: UpdateQuery<UserDocument> = {
      $set: {
        isDeleted: false,
        deletedAt: null,
        isActive: true, // Typically, a restored user is also active
      },
    };
    // Use the generic update method from BaseRepository
    return this.update(id, update);
  }

  /**
   * Updates a user's last login timestamp.
   * @param id The ID of the user.
   * @returns The updated user document, or null if not found.
   */
  async updateLastLogin(id: string): Promise<UserDocument | null> {
    const update: UpdateQuery<UserDocument> = {
      $set: {
        lastLoginAt: new Date(),
      },
    };
    return this.update(id, update);
  }

  /**
   * Updates a user's email verification status.
   * Also clears the verification token and its expiry.
   * @param id The ID of the user.
   * @param isVerified The new verification status.
   * @returns The updated user document, or null if not found.
   */
  async updateVerificationStatus(id: string, isVerified: boolean): Promise<UserDocument | null> {
    const update: UpdateQuery<UserDocument> = {
      $set: {
        isVerified: isVerified,
        verificationToken: undefined, // Clear the token
        verificationExpires: undefined, // Clear the expiry
      },
    };
    return this.update(id, update);
  }

  /**
   * Updates a user's password.
   * Also clears the password reset token and its expiry.
   * @param id The ID of the user.
   * @param hashedPassword The new hashed password.
   * @returns The updated user document, or null if not found.
   */
  async updatePassword(id: string, hashedPassword: string): Promise<UserDocument | null> {
    const update: UpdateQuery<UserDocument> = {
      $set: {
        password: hashedPassword,
        resetPasswordToken: undefined, // Clear the token
        resetPasswordExpires: undefined, // Clear the expiry
      },
    };
    return this.update(id, update);
  }

  /**
   * Assigns new roles to a user.
   * @param id The ID of the user.
   * @param roles The array of new roles.
   * @returns The updated user document, or null if not found.
   */
  async assignRoles(id: string, roles: UserRole[]): Promise<UserDocument | null> {
    const update: UpdateQuery<UserDocument> = {
      $set: {
        roles: roles,
      },
    };
    return this.update(id, update);
  }
}
