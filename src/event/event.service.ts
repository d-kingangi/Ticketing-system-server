import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FilterQuery, Types } from 'mongoose';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventRepository } from './event.repository';
import { EventDocument } from './entities/event.entity';
import { EventResponseDto } from './dto/event-response.dto';
import { FindAllEventsQueryDto } from './dto/find-all-events-query.dto';
import { PaginatedResponseDto } from '../shared/dto/paginated-response.dto';
import { OrganizationService } from 'src/organization/organization.service'; // Assuming this is available

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly organizationService: OrganizationService,
  ) { }

  /**
   * Maps an EventDocument to a public-facing EventResponseDto.
   * @param event The event document from the database.
   * @returns The mapped DTO.
   */
  private mapToResponseDto(event: EventDocument): EventResponseDto {
    if (!event) {
      return null;
    }
    return {
      id: event._id.toString(),
      userId: event.userId,
      organizationId: event.organizationId?.toString(), // Ensure organizationId is mapped as string
      title: event.title,
      description: event.description,
      organizers: event.organizers,
      categoryId: event.categoryId,
      location: event.location,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      featuredImage: event.featuredImage,
      galleryImages: event.galleryImages,
      socialMediaLinks: event.socialMediaLinks, // Ensure this is included if it exists
      status: event.status,
      isPublic: event.isPublic,
      maxAttendees: event.maxAttendees,
      isDeleted: event.isDeleted,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      updatedBy: event.updatedBy,
    };
  }

  /**
   * Creates a new event for a specific organization.
   * @param createEventDto DTO for creating the event.
   * @param userId The ID of the user creating the event.
   * @param organizationId The ID of the organization this event belongs to.
   * @returns The newly created event.
   */
  async create(
    createEventDto: CreateEventDto,
    userId: string,
    organizationId: string,
  ): Promise<EventResponseDto> {
    this.logger.log(
      `User ${userId} attempting to create event "${createEventDto.title}" for organization ${organizationId}`,
    );

    // Verify the user is authorized for the given organization.
    // This method will throw an exception if the user is not authorized or if IDs are invalid.
    await this.organizationService.verifyUserInOrganization(userId, organizationId);

    try {
      const eventData = {
        ...createEventDto,
        userId,
        organizationId: new Types.ObjectId(organizationId), // Ensure it's an ObjectId
      };

      const newEvent = await this.eventRepository.create(eventData);
      this.logger.log(`Successfully created event with ID: ${newEvent._id}`);
      return this.mapToResponseDto(newEvent);
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Finds all public events with pagination and filtering.
   * @param queryDto DTO for pagination and filtering options.
   * @returns A paginated list of public events.
   */
  async findAllPublic(
    queryDto: FindAllEventsQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    this.logger.log(`Fetching all public events with query: ${JSON.stringify(queryDto)}`);

    const { page, limit, title, category, organizationId, status, sortBy, sortDirection } = queryDto;

    const filter: FilterQuery<EventDocument> = {
      isPublic: true, // Only fetch public events
      isDeleted: false, // Exclude soft-deleted events
    };

    if (title) filter.title = { $regex: title, $options: 'i' };
    if (category) filter.category = category;
    if (organizationId) filter.organizationId = new Types.ObjectId(organizationId); // Filter by organizationId if provided
    if (status) filter.status = status;

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    const paginatedResult = await this.eventRepository.findWithPagination(filter, page, limit, sort);

    return new PaginatedResponseDto({
      data: paginatedResult.data.map(this.mapToResponseDto),
      total: paginatedResult.total,
      currentPage: paginatedResult.page,
      totalPages: paginatedResult.pages,
    });
  }

  /**
   * Finds all events for a specific organization with pagination and filtering.
   * This method is intended for authenticated agents/organizers.
   * @param organizationId The ID of the organization whose events to fetch.
   * @param queryDto DTO for pagination and filtering options.
   * @returns A paginated list of events for the organization.
   */
  async findAllByOrganization(
    organizationId: string,
    queryDto: FindAllEventsQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    this.logger.log(`Fetching events for organization ${organizationId} with query: ${JSON.stringify(queryDto)}`);

    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException('Invalid organization ID format.');
    }

    const { page, limit, title, category, status, sortBy, sortDirection, includeDeleted } = queryDto;

    const filter: FilterQuery<EventDocument> = {
      organizationId: new Types.ObjectId(organizationId), // Crucial: enforce organization ownership
    };

    if (title) filter.title = { $regex: title, $options: 'i' };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (!includeDeleted) filter.isDeleted = false; // Only include non-deleted by default

    const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

    const paginatedResult = await this.eventRepository.findWithPagination(filter, page, limit, sort);

    return new PaginatedResponseDto({
      data: paginatedResult.data.map(this.mapToResponseDto),
      total: paginatedResult.total,
      currentPage: paginatedResult.page,
      totalPages: paginatedResult.pages,
    });
  }

  /**
   * Finds a single public event by its ID.
   * @param eventId The ID of the event.
   * @returns The found event.
   */
  async findOnePublic(eventId: string): Promise<EventResponseDto> {
    this.logger.log(`Fetching public event with ID: ${eventId}`);
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }

    const event = await this.eventRepository.findOne({
      _id: new Types.ObjectId(eventId), // Ensure ObjectId
      isPublic: true,
      isDeleted: false,
    });

    if (!event) {
      throw new NotFoundException(`Public event with ID "${eventId}" not found.`);
    }
    return this.mapToResponseDto(event);
  }

  /**
   * Finds a single event by its ID, ensuring it belongs to the specified organization.
   * This method is intended for authorized access (e.g., by agents or for internal service calls).
   * @param eventId The ID of the event.
   * @param organizationId The ID of the organization the event must belong to.
   * @param includeDeleted Whether to include soft-deleted events.
   * @returns The found event's public response DTO.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the event is not found or does not belong to the organization.
   */
  async findOne(
    eventId: string,
    organizationId: string, // Now required for authorization
    includeDeleted: boolean = false,
  ): Promise<EventResponseDto> {
    this.logger.log(`Fetching event ${eventId} for organization ${organizationId}`);
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException('Invalid organization ID format.');
    }

    const filter: FilterQuery<EventDocument> = {
      _id: new Types.ObjectId(eventId),
      organizationId: new Types.ObjectId(organizationId), // Crucial: enforce organization ownership
    };
    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    const event = await this.eventRepository.findOne(filter);

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found for your organization.`);
    }
    return this.mapToResponseDto(event);
  }

  /**
   * Updates an event, ensuring the user has permission.
   * @param eventId The ID of the event to update.
   * @param updateEventDto DTO with the update data.
   * @param userId The ID of the user performing the update.
   * @param organizationId The organization ID of the user.
   * @returns The updated event.
   */
  async update(
    eventId: string,
    updateEventDto: UpdateEventDto,
    userId: string,
    organizationId: string,
  ): Promise<EventResponseDto> {
    this.logger.log(`User ${userId} attempting to update event ${eventId} for organization ${organizationId}`);

    // Use the findOne method to perform lookup and authorization check in one step.
    // This ensures the event exists and belongs to the correct organization before proceeding.
    await this.findOne(eventId, organizationId); // This will throw NotFound/BadRequest if not found/authorized

    const updateData = { ...updateEventDto, updatedBy: userId };
    const updatedEvent = await this.eventRepository.update(eventId, updateData);

    this.logger.log(`Successfully updated event with ID: ${eventId}`);
    return this.mapToResponseDto(updatedEvent);
  }

  /**
   * Soft-deletes an event, ensuring the user has permission.
   * @param eventId The ID of the event to soft-delete.
   * @param userId The ID of the user performing the action.
   * @param organizationId The organization ID of the user.
   * @returns A success message.
   */
  async softDelete(
    eventId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`User ${userId} attempting to soft-delete event ${eventId} from organization ${organizationId}`);

    // Use the findOne method to ensure the event exists and belongs to the organization before deleting.
    await this.findOne(eventId, organizationId); // This will throw NotFound/BadRequest if not found/authorized

    await this.eventRepository.softDelete(eventId, userId);
    this.logger.log(`Successfully soft-deleted event with ID: ${eventId}`);
    return { message: `Event with ID "${eventId}" has been successfully deleted.` };
  }

  /**
   * Restores a soft-deleted event, ensuring the user has permission and the event belongs to their organization.
   * @param eventId The ID of the event to restore.
   * @param userId The ID of the user performing the action.
   * @param organizationId The organization ID of the user.
   * @returns The restored event.
   */
  async restore(
    eventId: string,
    userId: string,
    organizationId: string,
  ): Promise<EventResponseDto> {
    this.logger.log(`User ${userId} attempting to restore event ${eventId} for organization ${organizationId}`);

    // Use findOne with includeDeleted=true to find the event and authorize in one step.
    await this.findOne(eventId, organizationId, true); // This will throw NotFound/BadRequest if not found/authorized

    const restoredEvent = await this.eventRepository.restore(eventId, userId);
    this.logger.log(`Successfully restored event with ID: ${eventId}`);
    return this.mapToResponseDto(restoredEvent);
  }

  /**
   * Permanently deletes an event. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   * @param eventId The ID of the event to permanently delete.
   * @returns A success message.
   */
  async hardDelete(eventId: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to permanently delete event with ID: ${eventId}`);
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }

    // No organizationId check here, as this is likely for a system ADMIN.
    // The controller will enforce the ADMIN role.
    const deletedEvent = await this.eventRepository.delete(eventId);

    if (!deletedEvent) {
      throw new NotFoundException(`Event with ID "${eventId}" not found for permanent deletion.`);
    }
    this.logger.log(`Successfully permanently deleted event with ID: ${eventId}`);
    return { message: `Event with ID "${eventId}" has been permanently deleted.` };
  }
}
