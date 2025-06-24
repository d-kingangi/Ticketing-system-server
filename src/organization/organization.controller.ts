import { Controller, Get, Post, Body, Patch, Param, Delete, ForbiddenException, HttpStatus, Logger, Query, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ApiBearerAuth, ApiOperation, ApiBody, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/guards/client-access.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/auth/schema/user.schema';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { FindAllOrganizationsQueryDto } from './dto/find-all-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';

@Controller('organizations') // Changed to plural for RESTful consistency
@ApiBearerAuth() // Indicates that JWT authentication is required for all endpoints in this controller
@UseGuards(JwtAuthGuard)
export class OrganizationController {
private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly organizationService: OrganizationService) {}
  
  /**
   * Creates a new organization.
   * - Agents can create an organization, and they will be set as the owner.
   * - Admins can create an organization and optionally specify a different ownerId.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Only agents and admins can create organizations
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization successfully created.',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Organization with this org_code or email already exists.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @GetUser('_id') userId: string, // The ID of the authenticated user
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<OrganizationResponseDto> {
    // If the authenticated user is an AGENT, they can only create an organization for themselves.
    // The ownerId in the DTO must be overridden with their own userId.
    if (!userRoles.includes(UserRole.ADMIN)) {
      createOrganizationDto.ownerId = userId;
    } else {
      // If the authenticated user is an ADMIN:
      // If ownerId is not provided in the DTO, default it to the admin's userId.
      // If ownerId is provided, the admin is creating an organization for that specific user.
      if (!createOrganizationDto.ownerId) {
        createOrganizationDto.ownerId = userId;
      }
    }

    return this.organizationService.create(createOrganizationDto);
  }

  /**
   * Retrieves all organizations with pagination and filtering.
   * This endpoint is typically for system administrators who need to view all organizations.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Only Admins can fetch all organizations
  @ApiOperation({
    summary: 'Get all organizations with pagination and filtering (ADMIN ONLY)',
  })
  @ApiQuery({ type: FindAllOrganizationsQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of organizations.',
    type: PaginatedResponseDto<OrganizationResponseDto>,
  })
  async findAll(
    @Query() query: FindAllOrganizationsQueryDto,
  ): Promise<PaginatedResponseDto<OrganizationResponseDto>> {
    return this.organizationService.findAll(query);
  }

  /**
   * Retrieves all organizations owned by the authenticated agent.
   * This endpoint allows agents to see only the organizations they are associated with as owners.
   */
  @Get('my-organizations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT) // Only agents can use this endpoint to find their own organizations
  @ApiOperation({
    summary: 'Get all organizations owned by the authenticated agent',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of organizations owned by the user.',
    type: [OrganizationResponseDto], // This endpoint returns an array, not a paginated response
  })
  async findMyOrganizations(
    @GetUser('_id') userId: string, // Inject the ID of the authenticated user
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationService.findByOwnerId(userId);
  }

  /**
   * Retrieves a single organization by its ID.
   * - Admins can retrieve any organization.
   * - Agents can only retrieve organizations they own.
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT) // Admins can get any, Agents can get their own
  @ApiOperation({ summary: 'Get an organization by ID' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization details.',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to access this organization.',
  })
  async findOne(
    @Param('id') id: string,
    @GetUser('_id') userId: string, // Inject the ID of the authenticated user
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<OrganizationResponseDto> {
    // Admins can fetch any organization
    if (userRoles.includes(UserRole.ADMIN)) {
      return this.organizationService.findOne(id);
    }

    // Agents can only fetch organizations they own
    const organization = await this.organizationService.findByOwnerId(userId);
    const org = organization.find((org) => org.id === id);

    if (!org) {
      throw new ForbiddenException(
        'You do not have permission to access this organization.',
      );
    }
    return org;
  }

  /**
   * Updates an existing organization.
   * - Admins can update any organization.
   * - Agents can only update organizations they own.
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT) // Admins can update any, Agents can update their own
  @ApiOperation({ summary: 'Update an organization' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the organization' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization successfully updated.',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to update this organization.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Organization with this email already exists.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser('_id') userId: string, // User performing the update
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<OrganizationResponseDto> {
    // Authorization check: Ensure agent can only update their own organization
    // For agents, verify ownership before proceeding
    if (!userRoles.includes(UserRole.ADMIN)) {
      const organizations = await this.organizationService.findByOwnerId(
        userId,
      );
      const isOwner = organizations.some((org) => org.id === id);
      if (!isOwner) {
        throw new ForbiddenException(
          'You do not have permission to update this organization.',
        );
      }
    }

    return this.organizationService.update(id, updateOrganizationDto, userId);
  }

  /**
   * Soft deletes an organization.
   * - Admins can soft delete any organization.
   * - Agents can only soft delete organizations they own.
   */
  @Delete(':id/soft') // Using '/soft' suffix for soft delete
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT) // Admins can soft delete any, Agents can soft delete their own
  @ApiOperation({ summary: 'Soft delete an organization' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the organization' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Organization successfully soft-deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to delete this organization.',
  })
  async softRemove(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<{ message: string }> {
    // Authorization check: Ensure agent can only soft delete their own organization
    if (!userRoles.includes(UserRole.ADMIN)) {
      const organizations = await this.organizationService.findByOwnerId(
        userId,
      );
      const isOwner = organizations.some((org) => org.id === id);
      if (!isOwner) {
        throw new ForbiddenException(
          'You do not have permission to delete this organization.',
        );
      }
    }
    return this.organizationService.softRemove(id, userId);
  }

  /**
   * Restores a soft-deleted organization.
   * - Admins can restore any organization.
   * - Agents can only restore organizations they own.
   */
  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT) // Admins can restore any, Agents can restore their own
  @ApiOperation({ summary: 'Restore a soft-deleted organization' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization successfully restored.',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found or not deleted.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to restore this organization.',
  })
  async restore(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<OrganizationResponseDto> {
    // Authorization check: Ensure agent can only restore their own organization
    if (!userRoles.includes(UserRole.ADMIN)) {
      const organizations = await this.organizationService.findByOwnerId(
        userId,
      );
      const isOwner = organizations.some((org) => org.id === id);
      if (!isOwner) {
        throw new ForbiddenException(
          'You do not have permission to restore this organization.',
        );
      }
    }
    return this.organizationService.restore(id, userId);
  }

  /**
   * Permanently deletes an organization. Use with extreme caution.
   * This method should typically be restricted to ADMIN roles.
   */
  @Delete(':id/hard') // Using '/hard' suffix for hard delete
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Only Admins can hard delete
  @ApiOperation({ summary: 'Permanently delete an organization (ADMIN ONLY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID of the organization' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Organization successfully permanently deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found.' })
  async hardRemove(@Param('id') id: string): Promise<{ message: string }> {
    return this.organizationService.hardRemove(id);
  }

  /**
   * Adds a user to an organization's associated users list.
   * - Admins can add users to any organization.
   * - Agents can only add users to organizations they own.
   */
  @Post(':id/users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT) // Admins can add users to any org, Agents to their own
  @ApiOperation({ summary: 'Add a user to an organization' })
  @ApiParam({ name: 'id', description: 'ID of the organization' })
  @ApiParam({ name: 'userId', description: 'ID of the user to add' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully added to organization.',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization or User not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to manage users for this organization.',
  })
  async addUserToOrganization(
    @Param('id') organizationId: string,
    @Param('userId') targetUserId: string,
    @GetUser('_id') currentUserId: string,
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<OrganizationResponseDto> {
    // Authorization check: Ensure agent can only add users to their own organization
    if (!userRoles.includes(UserRole.ADMIN)) {
      const organizations = await this.organizationService.findByOwnerId(
        currentUserId,
      );
      const isOwner = organizations.some((org) => org.id === organizationId);
      if (!isOwner) {
        throw new ForbiddenException(
          'You do not have permission to manage users for this organization.',
        );
      }
    }
    return this.organizationService.addUserToOrganization(
      organizationId,
      targetUserId,
    );
  }

  /**
   * Removes a user from an organization's associated users list.
   * - Admins can remove users from any organization.
   * - Agents can only remove users from organizations they own.
   */
  @Delete(':id/users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT) // Admins can remove users from any org, Agents from their own
  @ApiOperation({ summary: 'Remove a user from an organization' })
  @ApiParam({ name: 'id', description: 'ID of the organization' })
  @ApiParam({ name: 'userId', description: 'ID of the user to remove' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully removed from organization.',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization or User not found.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Not allowed to manage users for this organization.',
  })
  async removeUserFromOrganization(
    @Param('id') organizationId: string,
    @Param('userId') targetUserId: string,
    @GetUser('_id') currentUserId: string,
    @GetUser('roles') userRoles: UserRole[],
  ): Promise<OrganizationResponseDto> {
    // Authorization check: Ensure agent can only remove users from their own organization
    if (!userRoles.includes(UserRole.ADMIN)) {
      const organizations = await this.organizationService.findByOwnerId(
        currentUserId,
      );
      const isOwner = organizations.some((org) => org.id === organizationId);
      if (!isOwner) {
        throw new ForbiddenException(
          'You do not have permission to manage users for this organization.',
        );
      }
    }
    return this.organizationService.removeUserFromOrganization(
      organizationId,
      targetUserId,
    );
  }
}
