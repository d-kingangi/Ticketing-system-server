import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '../entities/organization.entity';
import {
  CreateBankPaymentDetailsDto,
  CreateMpesaPaymentDetailsDto,
  CreateLocationDto,
} from './create-organization.dto'; // Reusing nested DTOs for response

export class SocialMediaLinkResponseDto {
  @ApiProperty({ description: 'The social media platform (e.g., "Twitter", "Facebook")', example: 'Twitter' })
  platform: string;

  @ApiProperty({ description: 'The full URL to the organization\'s profile', example: 'https://twitter.com/acme_events' })
  url: string;
}

export class OrganizationResponseDto {
  @ApiProperty({ description: 'The unique identifier of the organization.' })
  id: string;

  @ApiProperty({ description: 'The full name of the organization.' })
  name: string;

  @ApiProperty({ description: 'A unique short code for the organization.' })
  org_code: string;

  @ApiPropertyOptional({ description: 'URL to the organization\'s logo.' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'KRA PIN or equivalent tax identification number.' })
  kraPin?: string;

  @ApiPropertyOptional({ description: 'Main contact phone number for the organization.' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Main contact email for the organization.' })
  email?: string;

  @ApiPropertyOptional({ description: 'Physical address of the organization.' })
  address?: string;

  @ApiPropertyOptional({ description: 'Official website URL.' })
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Social media links for the organization', type: [SocialMediaLinkResponseDto] })
  socialMediaLinks?: SocialMediaLinkResponseDto[];

  @ApiPropertyOptional({ description: 'Name of the primary contact person.' })
  primaryContact?: string;

  @ApiProperty({ enum: OrganizationStatus, description: 'Current operational status of the organization.' })
  status: OrganizationStatus;

  @ApiProperty({ description: 'Boolean flag indicating if the organization is active.' })
  isActive: boolean;

  @ApiProperty({ description: 'Indicates if the organization is verified.', example: false })
  isVerified: boolean;

  @ApiPropertyOptional({ description: 'Date when the organization\'s subscription/account expires.' })
  expiry_date?: Date;

  @ApiPropertyOptional({ description: 'Location details of the organization.', type: CreateLocationDto })
  location?: CreateLocationDto;

  @ApiPropertyOptional({ description: 'Flag if STK Push is enabled.' })
  hasStkPush?: boolean;

  @ApiPropertyOptional({ description: 'API ID for STK Push integration.' })
  stkPushApiId?: string;

  @ApiPropertyOptional({ description: 'Bank payment details.', type: [CreateBankPaymentDetailsDto] })
  bankPaymentDetails?: CreateBankPaymentDetailsDto[];

  @ApiPropertyOptional({ description: 'M-Pesa payment details.', type: [CreateMpesaPaymentDetailsDto] })
  mpesaPaymentDetails?: CreateMpesaPaymentDetailsDto[];

  @ApiProperty({ description: 'The ID of the user who owns this organization.' })
  ownerId: string;

  @ApiProperty({ description: 'Array of User IDs associated with this organization (e.g., agents).' })
  users: string[];

  @ApiProperty({ description: 'Boolean flag indicating if the organization is soft-deleted.' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Timestamp of when the organization was created.' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of when the organization was last updated.' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'The ID of the user who last updated the organization.' })
  updatedBy?: string;
}