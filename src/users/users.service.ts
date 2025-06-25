import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserDocument, UserRole } from '../auth/schema/user.schema'; // Corrected import path for UserDocument and UserRole
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRepository } from './users.repository'; // Import the new UserRepository
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto'; // Use the comprehensive query DTO
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto'; // Assuming you have a PaginatedResponseDto
import { FilterQuery, Types } from 'mongoose';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    // Inject the UserRepository instead of the raw Mongoose Model
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Maps a UserDocument to a public-facing UserResponseDto.
   * This method ensures sensitive information like passwords are not exposed.
   * @param user The user document from the database.
   * @returns The mapped DTO.
   */
  private mapToResponseDto(user: UserDocument): UserResponseDto {
    if (!user) {
      return null;
    }
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName, // Access the virtual fullName property
      email: user.email,
      phone: user.phone,
      profileUrl: user.profileUrl,
      roles: user.roles,
      isActive: user.isActive,
      isVerified: user.isVerified,
      isDeleted: user.isDeleted,
      deletedAt: user.deletedAt,
      lastLoginAt: user.lastLoginAt,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Creates a new user in the system.
   * Hashes the password before saving and ensures email uniqueness.
   * @param createUserDto DTO containing user creation data.
   * @returns The created user's public response DTO.
   * @throws ConflictException if a user with the given email already exists.
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, roles, firstName, lastName } = createUserDto;
    this.logger.log(`Attempting to create user: ${email}`);

    // Check if user already exists with the given email using the repository
    const existingUser = await this.userRepository.findByEmail(email, true); // Include deleted to prevent re-registration
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user document using the repository's create method
    const newUser = await this.userRepository.create({
      firstName,
      lastName,
      email: email.toLowerCase(), // Store email in lowercase
      password: hashedPassword,
      roles: roles || [UserRole.CUSTOMER], // Default to CUSTOMER role if not provided
      isActive: createUserDto.isActive ?? true, // Use provided isActive or default to true
      isVerified: false, // New users are not verified by default
      // Other fields like phone, profileUrl, settings will be undefined if not provided in DTO
    });

    this.logger.log(`User ${newUser._id} created successfully.`);
    return this.mapToResponseDto(newUser);
  }

  /**
   * Finds all users with pagination and filtering capabilities.
   * @param query DTO containing pagination, sorting, and filtering options.
   * @returns A paginated list of user response DTOs.
   */
  async findAll(
    query: FindAllUsersQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    this.logger.log(`Fetching all users with query: ${JSON.stringify(query)}`);

    const {
      page = 1,
      limit = 10,
      firstName,
      lastName,
      email,
      roles,
      isActive,
      isVerified,
      includeDeleted = false,
      sortBy = 'createdAt',
      sortDirection = 'desc',
      createdAtGte,
      createdAtLte,
    } = query;

    // Build filter object for the repository
    const filter: FilterQuery<UserDocument> = {};

    if (firstName) {
      filter.firstName = { $regex: firstName, $options: 'i' }; // Case-insensitive partial match
    }
    if (lastName) {
      filter.lastName = { $regex: lastName, $options: 'i' }; // Case-insensitive partial match
    }
    if (email) {
      filter.email = { $regex: email, $options: 'i' }; // Case-insensitive partial match
    }
    if (roles && roles.length > 0) {
      filter.roles = { $in: roles };
    }
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
    if (isVerified !== undefined) {
      filter.isVerified = isVerified;
    }
    // Only include deleted users if explicitly requested
    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    // Date range filtering for createdAt
    if (createdAtGte || createdAtLte) {
      filter.createdAt = {};
      if (createdAtGte) {
        filter.createdAt.$gte = new Date(createdAtGte);
      }
      if (createdAtLte) {
        filter.createdAt.$lte = new Date(createdAtLte);
      }
    }

    // Prepare sort options
    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    // Use the repository's findWithPagination method
    const paginatedResult = await this.userRepository.findWithPagination(
      filter,
      page,
      limit,
      sort,
    );

    return new PaginatedResponseDto({
      data: paginatedResult.data.map(this.mapToResponseDto),
      total: paginatedResult.total,
      currentPage: paginatedResult.page,
      totalPages: paginatedResult.pages,
    });
  }

  /**
   * Counts users based on a given filter.
   * @param filter The filter query to apply for counting.
   * @returns An object containing the count of users.
   */
  async count(filter: FilterQuery<UserDocument> = {}): Promise<{ count: number }> {
    this.logger.log(`Counting users with filter: ${JSON.stringify(filter)}`);
    // Use the repository's count method
    const count = await this.userRepository.count(filter);
    return { count };
  }

  /**
   * Finds a single user by their ID.
   * @param id The ID of the user to find.
   * @returns The user's public response DTO.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async findOne(id: string): Promise<UserResponseDto> {
    this.logger.log(`Finding user with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }

    // Use the repository's findById method, which handles NotFoundException
    const user = await this.userRepository.findById(id);
    return this.mapToResponseDto(user);
  }

  /**
   * Finds a user by their email address.
   * This method is useful for internal lookups, e.g., during authentication.
   * @param email The email address of the user.
   * @param includeDeleted Optional: Whether to include soft-deleted users.
   * @returns The user document, or null if not found.
   */
  async findByEmail(email: string, includeDeleted: boolean = false): Promise<UserDocument | null> {
    this.logger.log(`Finding user by email: ${email}`);
    // Use the repository's findByEmail method
    return this.userRepository.findByEmail(email, includeDeleted);
  }

  /**
   * Updates an existing user's information.
   * Handles password hashing if the password is updated and checks for email uniqueness.
   * @param id The ID of the user to update.
   * @param updateUserDto DTO containing the updated user data.
   * @returns The updated user's public response DTO.
   * @throws NotFoundException if the user is not found.
   * @throws ConflictException if the updated email already exists for another user.
   * @throws BadRequestException if the ID format is invalid.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Updating user with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }

    // Find the existing user using the repository
    const user = await this.userRepository.findById(id);

    // If email is being updated, check for uniqueness among other users
    if (updateUserDto.email && updateUserDto.email.toLowerCase() !== user.email) {
      const existingUserWithNewEmail = await this.userRepository.findByEmail(
        updateUserDto.email,
        true, // Check against all users, including deleted ones
      );
      if (existingUserWithNewEmail && existingUserWithNewEmail._id.toString() !== id) {
        throw new ConflictException(`User with email ${updateUserDto.email} already exists.`);
      }
    }

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Use the repository's update method to perform the update
    const updatedUser = await this.userRepository.update(id, updateUserDto);

    this.logger.log(`User ${id} updated successfully.`);
    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Soft-deletes a user by setting `isDeleted` to true and `deletedAt` to the current date.
   * @param id The ID of the user to soft-delete.
   * @returns A message indicating successful soft deletion.
   * @throws NotFoundException if the user is not found or already soft-deleted.
   * @throws BadRequestException if the ID format is invalid.
   */
  async softDelete(id: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to soft-delete user with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }

    // Use the repository's softDelete method
    const deletedUser = await this.userRepository.softDelete(id);
    if (!deletedUser) {
      throw new NotFoundException(`User with ID "${id}" not found or already deleted.`);
    }

    this.logger.log(`Successfully soft-deleted user with ID: ${id}.`);
    return { message: `User with ID "${id}" has been successfully soft-deleted.` };
  }

  /**
   * Restores a soft-deleted user by setting `isDeleted` to false and `deletedAt` to null.
   * @param id The ID of the user to restore.
   * @returns The restored user's public response DTO.
   * @throws NotFoundException if the user is not found or not soft-deleted.
   * @throws BadRequestException if the ID format is invalid.
   */
  async restore(id: string): Promise<UserResponseDto> {
    this.logger.log(`Attempting to restore user with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }

    // Use the repository's restore method
    const restoredUser = await this.userRepository.restore(id);
    if (!restoredUser) {
      throw new NotFoundException(`Deleted user with ID "${id}" not found or not in a soft-deleted state.`);
    }

    this.logger.log(`Successfully restored user with ID: ${id}.`);
    return this.mapToResponseDto(restoredUser);
  }

  /**
   * Permanently deletes a user record from the database. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   * @param id The ID of the user to permanently delete.
   * @returns A message indicating successful permanent deletion.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to permanently delete user with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }

    // Use the repository's delete method
    const deletedUser = await this.userRepository.delete(id);
    if (!deletedUser) {
      throw new NotFoundException(`User with ID "${id}" not found for permanent deletion.`);
    }

    this.logger.log(`Successfully permanently deleted user with ID: ${id}.`);
    return { message: `User with ID "${id}" has been permanently deleted.` };
  }

  /**
   * Updates a user's last login timestamp.
   * @param id The ID of the user.
   * @returns The updated user's public response DTO.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async updateLastLogin(id: string): Promise<UserResponseDto> {
    this.logger.log(`Updating last login for user: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }
    const updatedUser = await this.userRepository.updateLastLogin(id);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Updates a user's email verification status.
   * @param id The ID of the user.
   * @param isVerified The new verification status.
   * @returns The updated user's public response DTO.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async updateVerificationStatus(id: string, isVerified: boolean): Promise<UserResponseDto> {
    this.logger.log(`Updating verification status for user ${id} to ${isVerified}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }
    const updatedUser = await this.userRepository.updateVerificationStatus(id, isVerified);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Updates a user's password.
   * @param id The ID of the user.
   * @param newPassword The new plain text password to hash and set.
   * @returns The updated user's public response DTO.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async updatePassword(id: string, newPassword: string): Promise<UserResponseDto> {
    this.logger.log(`Updating password for user: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await this.userRepository.updatePassword(id, hashedPassword);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Assigns new roles to a user.
   * @param id The ID of the user.
   * @param roles The array of new roles to assign.
   * @returns The updated user's public response DTO.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async assignRoles(id: string, roles: UserRole[]): Promise<UserResponseDto> {
    this.logger.log(`Assigning roles to user ${id}: ${roles.join(', ')}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }
    const updatedUser = await this.userRepository.assignRoles(id, roles);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return this.mapToResponseDto(updatedUser);
  }
}
