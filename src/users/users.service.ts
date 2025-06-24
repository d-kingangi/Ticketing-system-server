import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserDocument, UserRole } from 'src/auth/schema/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UserQueryDto } from './user-query.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Map user document to user response DTO (excluding sensitive info)
   */
  private mapToResponseDto(user: UserDocument): UserResponseDto {
    const response = {
      id: user._id.toString(),
      // Changed from fullName to individual firstName and lastName, and roles array
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName, // Access the virtual fullName property
      email: user.email,
      roles: user.roles, // Changed from 'role' to 'roles' (array)
      isVerified: user.isVerified, // Added new field
      // clientId: user.clientId?.toString(), // Keep commented out if not in use
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return response;
  }

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, roles } = createUserDto; // Changed 'role' to 'roles'

    try {

      // Check if user already exists with the given email
      const existingUser = await this.userModel.findOne({ email }).exec();
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user, ensuring roles and isVerified are set
      const newUser = new this.userModel({
        ...createUserDto,
        password: hashedPassword,
        roles: roles || [UserRole.CUSTOMER], // Default to CUSTOMER role if not provided
        isVerified: false, // New users are not verified by default
      });

      await newUser.save();

      return this.mapToResponseDto(newUser);
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all users with pagination and filtering
   */
  /**
   * Find all users with pagination and filtering
   */
  async findAll(query: UserQueryDto): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        fullName,
        email,
        roles, // Changed from 'role' to 'roles' (array)
        clientId,
        isActive,
        includeDeleted,
        sortBy = 'createdAt',
        sortDirection = -1,
      } = query;

      // Build filter object
      const filter: any = {};

      if (fullName) {
        // Searching by fullName (virtual) might not be efficient for large datasets.
        // Consider searching by firstName or lastName if more precise filtering is needed.
        filter.fullName = { $regex: fullName, $options: 'i' };
      }

      if (email) {
        filter.email = { $regex: email, $options: 'i' };
      }

      // If roles array is provided and not empty, use $in operator for filtering
      if (roles && roles.length > 0) {
        filter.roles = { $in: roles };
      }

      if (clientId) {
        filter.clientId = clientId;
      }

      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      // Only include deleted users if explicitly requested
      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Prepare sort options
      const sortOptions: Record<string, SortOrder> = {};
      sortOptions[sortBy] = sortDirection as SortOrder;

      // Execute query and count documents concurrently
      const [users, total] = await Promise.all([
        this.userModel
          .find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(filter).exec(),
      ]);

      return {
        data: users.map((user) => this.mapToResponseDto(user)),
        total,
        page: +page,
        limit: +limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to find users: ${error.message}`, error.stack);
      throw error;
    }
  }


  /**
   * Count users by client and/or role
   */
  async count(clientId?: string, role?: UserRole): Promise<{ count: number }> {
    try {
      const filter: any = { isDeleted: false };

      if (clientId) {
        filter.clientId = clientId;
      }

      if (role) {
        filter.role = role;
      }

      const count = await this.userModel.countDocuments(filter).exec();
      return { count };
    } catch (error) {
      this.logger.error(`Failed to count users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find a user by ID
   */
  /**
   * Find a user by ID
   */
  async findOne(id: string, clientId?: string): Promise<UserResponseDto> {
    try {
      // Build filter based on ID and optional clientId
      const filter: any = { _id: id, isDeleted: false };

      if (clientId) {
        filter.clientId = clientId;
      }

      const user = await this.userModel.findOne(filter).exec();

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error(`Failed to find user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a user
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    clientId?: string,
  ): Promise<UserResponseDto> {
    try {
      // Check if user exists based on ID and optional clientId
      const filter: any = { _id: id, isDeleted: false };

      if (clientId) {
        filter.clientId = clientId;
      }

      const user = await this.userModel.findOne(filter).exec();

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // If email is being updated, check for uniqueness among other users
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userModel
          .findOne({
            email: updateUserDto.email,
            _id: { $ne: id },
          })
          .exec();

        if (existingUser) {
          throw new ConflictException(
            `User with email ${updateUserDto.email} already exists`,
          );
        }
      }

      // If updating client, check if it exists - keep commented out if not in use
      // if (
      //   updateUserDto.clientId &&
      //   updateUserDto.clientId !== user.clientId?.toString()
      // ) {
      //   await this.clientsService.findOne(updateUserDto.clientId);
      // }

      // If password is being updated, hash it
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      // Find and update the user, returning the new document
      const updatedUser = await this.userModel
        .findOneAndUpdate(filter, updateUserDto, { new: true })
        .exec();

      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }


  /**
   * Soft delete a user
   */
  async remove(id: string, clientId?: string): Promise<void> {
    try {
      // Build filter based on clientId
      const filter: any = { _id: id, isDeleted: false };

      if (clientId) {
        filter.clientId = clientId;
      }

      const user = await this.userModel.findOne(filter).exec();

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Soft delete
      await this.userModel
        .findByIdAndUpdate(id, {
          isDeleted: true,
          deletedAt: new Date(),
        })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to remove user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted user
   */
  async restore(id: string, clientId?: string): Promise<UserResponseDto> {
    try {
      // Build filter based on clientId
      const filter: any = { _id: id, isDeleted: true };

      if (clientId) {
        filter.clientId = clientId;
      }

      const user = await this.userModel.findOne(filter).exec();

      if (!user) {
        throw new NotFoundException(`Deleted user with ID ${id} not found`);
      }

      // Restore user
      const restoredUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            isDeleted: false,
            deletedAt: null,
          },
          { new: true },
        )
        .exec();

      return this.mapToResponseDto(restoredUser);
    } catch (error) {
      this.logger.error(
        `Failed to restore user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
