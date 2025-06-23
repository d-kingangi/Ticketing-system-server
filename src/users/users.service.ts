// src/users/services/users.service.ts (fixed sort type)
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
import { ClientsService } from 'src/clients/clients.service';
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
    private readonly clientsService: ClientsService,
  ) {}

  /**
   * Map user document to user response DTO (excluding sensitive info)
   */
  private mapToResponseDto(user: UserDocument): UserResponseDto {
    const response = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      clientId: user.clientId?.toString(),
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
    const { email, password, clientId, role } = createUserDto;

    try {
      // Check if the client exists (if specified)
      if (clientId) {
        await this.clientsService.findOne(clientId);
      }

      // Check if user already exists
      const existingUser = await this.userModel.findOne({ email }).exec();
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new this.userModel({
        ...createUserDto,
        password: hashedPassword,
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
        role,
        clientId,
        isActive,
        includeDeleted,
        sortBy = 'createdAt',
        sortDirection = -1,
      } = query;

      // Build filter
      const filter: any = {};

      if (fullName) {
        filter.fullName = { $regex: fullName, $options: 'i' };
      }

      if (email) {
        filter.email = { $regex: email, $options: 'i' };
      }

      if (role) {
        filter.role = role;
      }

      if (clientId) {
        filter.clientId = clientId;
      }

      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      // Only include deleted if explicitly requested
      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;

      // Fix for sort option type
      const sortOptions: Record<string, SortOrder> = {};
      sortOptions[sortBy] = sortDirection as SortOrder;

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
  async findOne(id: string, clientId?: string): Promise<UserResponseDto> {
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
      // Check if user exists
      const filter: any = { _id: id, isDeleted: false };

      if (clientId) {
        filter.clientId = clientId;
      }

      const user = await this.userModel.findOne(filter).exec();

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // If updating email, check for uniqueness
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

      // If updating client, check if it exists
      if (
        updateUserDto.clientId &&
        updateUserDto.clientId !== user.clientId?.toString()
      ) {
        await this.clientsService.findOne(updateUserDto.clientId);
      }

      // If updating password, hash it
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      // Update user
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
