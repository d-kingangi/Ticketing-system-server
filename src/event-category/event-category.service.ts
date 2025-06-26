// event-category.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { EventCategoryRepository } from './event-category.repository'; // Import the repository
import { EventCategoryDocument, EventCategory } from './entities/event-category.entity'; // Import the entity
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto'; // Import PaginatedResponseDto
import { EventCategoryResponseDto } from './dto/event-category-response.dto';
import { FindAllEventCategoriesQueryDto } from './dto/find-all-event-categories-query.dto';

@Injectable()
export class EventCategoryService {
  private readonly logger = new Logger(EventCategoryService.name);

  constructor(
    // Inject the EventCategoryRepository
    private readonly eventCategoryRepository: EventCategoryRepository,
  ) {}

  /**
   * Maps an EventCategoryDocument to a public-facing EventCategoryResponseDto.
   * @param eventCategory The event category document from the database.
   * @returns The mapped DTO.
   */
  private mapToResponseDto(eventCategory: EventCategoryDocument): EventCategoryResponseDto {
    if (!eventCategory) {
      return null;
    }
    return {
      id: eventCategory._id.toString(),
      name: eventCategory.name,
      description: eventCategory.description,
      isActive: eventCategory.isActive,
      createdAt: eventCategory.createdAt,
      updatedAt: eventCategory.updatedAt,
    };
  }

  /**
   * Creates a new event category.
   * @param createEventCategoryDto DTO containing event category creation data.
   * @param userId The ID of the user creating the event category.
   * @param organizationId The ID of the organization this event category belongs to.
   * @returns The created event category's public response DTO.
   * @throws ConflictException if a category with the given name already exists.
   */
  async create(
    createEventCategoryDto: CreateEventCategoryDto,
    userId: string,
  ): Promise<EventCategoryResponseDto> {
    const { name, description, isActive } = createEventCategoryDto;
    this.logger.log(`Attempting to create event category: ${name}`);

    // Check if event category already exists with the given name
    const existingCategory = await this.eventCategoryRepository.findByName(name);
    if (existingCategory) {
      throw new ConflictException('Event category with this name already exists.');
    }

    // Create new event category document using the repository's create method
    const newCategory = await this.eventCategoryRepository.create({
      name,
      description,
      isActive,
      updatedBy: userId,
    });

    this.logger.log(`Event category ${newCategory._id} created successfully.`);
    return this.mapToResponseDto(newCategory);
  }

  /**
   * Finds all event categories with pagination.
   * @param query DTO containing pagination options.
   * @returns A paginated list of event category response DTOs.
   */
  async findAll(
    query: FindAllEventCategoriesQueryDto,
  ): Promise<PaginatedResponseDto<EventCategoryResponseDto>> {
    this.logger.log(`Fetching all event categories with query: ${JSON.stringify(query)}`);

    const { page = 1, limit = 10, sortBy = 'createdAt', sortDirection = 'desc' } = query;

    const filter: FilterQuery<EventCategoryDocument> = {}; // Define a filter
    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 }; // Sort options

    const paginatedResult = await this.eventCategoryRepository.findWithPagination(
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
   * Finds a single event category by its ID.
   * @param id The ID of the event category to find.
   * @returns The event category's public response DTO.
   * @throws NotFoundException if the event category is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async findOne(id: string): Promise<EventCategoryResponseDto> {
    this.logger.log(`Finding event category with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }

    const eventCategory = await this.eventCategoryRepository.findById(id);
    if (!eventCategory) {
      throw new NotFoundException(`Event category with ID "${id}" not found.`);
    }

    return this.mapToResponseDto(eventCategory);
  }

  /**
   * Updates an existing event category.
   * @param id The ID of the event category to update.
   * @param updateEventCategoryDto DTO containing the updated event category data.
   * @param userId The ID of the user performing the update.
   * @returns The updated event category's public response DTO.
   * @throws NotFoundException if the event category is not found.
   * @throws ConflictException if the updated name already exists for another event category.
   * @throws BadRequestException if the ID format is invalid.
   */
  async update(
    id: string,
    updateEventCategoryDto: UpdateEventCategoryDto,
    userId: string,
  ): Promise<EventCategoryResponseDto> {
    this.logger.log(`Updating event category with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }

    // Find the existing event category
    const existingCategory = await this.eventCategoryRepository.findById(id);
    if (!existingCategory) {
      throw new NotFoundException(`Event category with ID "${id}" not found.`);
    }

    // If name is being updated, check for uniqueness
    if (updateEventCategoryDto.name && updateEventCategoryDto.name !== existingCategory.name) {
      const existingCategoryWithName = await this.eventCategoryRepository.findByName(
        updateEventCategoryDto.name,
      );
      if (existingCategoryWithName && existingCategoryWithName._id.toString() !== id) {
        throw new ConflictException(`Event category with name "${updateEventCategoryDto.name}" already exists.`);
      }
    }

    // Perform the update using the repository
    const updatedCategory = await this.eventCategoryRepository.update(id, {
      ...updateEventCategoryDto,
      updatedBy: userId,
    });

    this.logger.log(`Event category ${id} updated successfully.`);
    return this.mapToResponseDto(updatedCategory);
  }

  /**
   * Soft-deletes an event category by setting `isDeleted` to true.
   * @param id The ID of the event category to soft-delete.
   * @param userId The ID of the user performing the action.
   * @returns A message indicating successful soft deletion.
   * @throws NotFoundException if the event category is not found or already soft-deleted.
   * @throws BadRequestException if the ID format is invalid.
   */
  async softDelete(id: string, userId: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to soft-delete event category with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }

    // Use the repository's softDelete method
    const deletedCategory = await this.eventCategoryRepository.softDelete(id, userId);
    if (!deletedCategory) {
      throw new NotFoundException(`Event category with ID "${id}" not found or already deleted.`);
    }

    this.logger.log(`Successfully soft-deleted event category with ID: ${id}.`);
    return { message: `Event category with ID "${id}" has been successfully deleted.` };
  }

  /**
   * Restores a soft-deleted event category.
   * @param id The ID of the event category to restore.
   * @param userId The ID of the user performing the action.
   * @returns A message indicating successful restoration.
   * @throws NotFoundException if the event category is not found or not soft-deleted.
   * @throws BadRequestException if the ID format is invalid.
   */
  async restore(id: string, userId: string): Promise<EventCategoryResponseDto> {
    this.logger.log(`Attempting to restore event category with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }

    // Use the repository's restore method
    const restoredCategory = await this.eventCategoryRepository.restore(id, userId);
    if (!restoredCategory) {
      throw new NotFoundException(`Event category with ID "${id}" not found or not in a soft-deleted state.`);
    }

    this.logger.log(`Successfully restored event category with ID: ${id}.`);
    return this.mapToResponseDto(restoredCategory);
  }

  /**
   * Permanently deletes an event category record from the database. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   * @param id The ID of the event category to permanently delete.
   * @returns A message indicating successful permanent deletion.
   * @throws NotFoundException if the event category is not found.
   * @throws BadRequestException if the ID format is invalid.
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to permanently delete event category with ID: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event category ID format.');
    }

    // Use the repository's delete method
    const deletedEventCategory = await this.eventCategoryRepository.delete(id);
    if (!deletedEventCategory) {
      throw new NotFoundException(`Event category with ID "${id}" not found for permanent deletion.`);
    }

    this.logger.log(`Successfully permanently deleted event category with ID: ${id}.`);
    return { message: `Event category with ID "${id}" has been permanently deleted.` };
  }
}
