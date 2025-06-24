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
// import { OrganizationService } from '../organization/organization.service'; // TODO: Uncomment when OrganizationService is available

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    // TODO: Uncomment the following line when OrganizationService is available
    // private readonly organizationService: OrganizationService,
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
      organizationId: event.organizationId,
      title: event.title,
      description: event.description,
      organizer: event.organizer,
      category: event.category,
      location: event.location,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      featuredImage: event.featuredImage,
      galleryImages: event.galleryImages,
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

    // TODO: When OrganizationService is available, verify the user is part of the organization.
    // await this.organizationService.verifyUserInOrganization(userId, organizationId);

    try {
      const eventData = {
        ...createEventDto,
        userId,
        organizationId,
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
    if (organizationId) filter.organizationId = organizationId;
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

    const { page, limit, title, category, status, sortBy, sortDirection, includeDeleted } = queryDto;

    const filter: FilterQuery<EventDocument> = {
      organizationId: organizationId, // Crucial: enforce organization ownership
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
      _id: eventId,
      isPublic: true,
      isDeleted: false,
    });

    if (!event) {
      throw new NotFoundException(`Public event with ID "${eventId}" not found.`);
    }
    return this.mapToResponseDto(event);
  }

  /**
   * Finds a single event by its ID for a specific organization.
   * This method is intended for authenticated agents/organizers.
   * @param eventId The ID of the event.
   * @param organizationId The ID of the organization the event should belong to.
   * @param includeDeleted Whether to include soft-deleted events.
   * @returns The found event.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the event is not found or does not belong to the organization.
   */
  async findOneByOrganization(
    eventId: string,
    organizationId: string,
    includeDeleted: boolean = false,
  ): Promise<EventResponseDto> {
    this.logger.log(`Fetching event ${eventId} for organization ${organizationId}`);
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }

    const filter: FilterQuery<EventDocument> = {
      _id: eventId,
      organizationId: organizationId, // Crucial: enforce organization ownership
    };
    if (!includeDeleted) filter.isDeleted = false;

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
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }

    const event = await this.eventRepository.findById(eventId);
    if (!event || event.isDeleted) {
      throw new NotFoundException(`Event with ID "${eventId}" not found.`);
    }

    // Authorization Check: Ensure the event belongs to the user's organization.
    if (event.organizationId !== organizationId) {
      this.logger.warn(`User ${userId} from org ${organizationId} tried to update event ${eventId} owned by org ${event.organizationId}`);
      throw new ForbiddenException('You do not have permission to update this event.');
    }

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
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }

    const event = await this.eventRepository.findById(eventId);
    if (!event || event.isDeleted) {
      throw new NotFoundException(`Event with ID "${eventId}" not found or already deleted.`);
    }

    // Authorization Check
    if (event.organizationId !== organizationId) {
      this.logger.warn(`User ${userId} from org ${organizationId} tried to delete event ${eventId} owned by org ${event.organizationId}`);
      throw new ForbiddenException('You do not have permission to delete this event.');
    }

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
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the event is not found or not in a soft-deleted state.
   * @throws ForbiddenException if the event does not belong to the user's organization.
   */
  async restore(
    eventId: string,
    userId: string,
    organizationId: string,
  ): Promise<EventResponseDto> {
    this.logger.log(`User ${userId} attempting to restore event ${eventId} for organization ${organizationId}`);
    if (!Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid event ID format.');
    }

    // First, find the event to perform authorization check
    // Note: We explicitly look for a deleted event here.
    const event = await this.eventRepository.findOne({ _id: eventId, isDeleted: true });
    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found or is not in a soft-deleted state.`);
    }

    // Authorization Check
    if (event.organizationId !== organizationId) {
      this.logger.warn(`User ${userId} from org ${organizationId} tried to restore event ${eventId} owned by org ${event.organizationId}`);
      throw new ForbiddenException('You do not have permission to restore this event.');
    }

    const restoredEvent = await this.eventRepository.restore(eventId, userId);
    this.logger.log(`Successfully restored event with ID: ${eventId}`);
    return this.mapToResponseDto(restoredEvent);
  }

  /**
   * Permanently deletes an event. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   * @param eventId The ID of the event to permanently delete.
   * @returns A success message.
   * @throws BadRequestException if the ID format is invalid.
   * @throws NotFoundException if the event is not found.
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
