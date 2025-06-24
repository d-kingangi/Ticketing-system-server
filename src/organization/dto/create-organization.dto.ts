import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize, ArrayMaxSize, IsNumber, IsUrl, IsEmail, IsEnum, IsBoolean, IsDateString, ValidateNested, IsMongoId } from "class-validator";
import { OrganizationStatus } from "../entities/organization.entity";

export class CreateBankPaymentDetailsDto {
    @ApiProperty({ description: 'Bank account number', example: '1234567890' })
    @IsString()
    @IsNotEmpty()
    accountNumber: string;

    @ApiProperty({ description: 'Bank account name', example: 'Acme Events Inc.' })
    @IsString()
    @IsNotEmpty()
    accountName: string;

    @ApiProperty({ description: 'Name of the bank', example: 'National Bank' })
    @IsString()
    @IsNotEmpty()
    bankName: string;

    @ApiPropertyOptional({ description: 'Branch name of the bank', example: 'Main Branch' })
    @IsOptional()
    @IsString()
    bankBranch?: string;
}

// Nested DTO for M-Pesa Payment Details
export class CreateMpesaPaymentDetailsDto {
    @ApiPropertyOptional({ description: 'M-Pesa Paybill number', example: '123456' })
    @IsOptional()
    @IsString()
    paybillNumber?: string;

    @ApiPropertyOptional({ description: 'Account number for Paybill (often the invoice number or customer ID)', example: 'ACME001' })
    @IsOptional()
    @IsString()
    accountNumber?: string;

    @ApiPropertyOptional({ description: 'M-Pesa Till Number (Buy Goods and Services)', example: '987654' })
    @IsOptional()
    @IsString()
    tillNumber?: string;
}

// Nested DTO for Location Details
export class CreateLocationDto {
    @ApiPropertyOptional({ description: 'Name of the location', example: 'Headquarters' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Street address', example: '123 Main St' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ description: 'City', example: 'Nairobi' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ description: 'State/Province', example: 'Nairobi County' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional({ description: 'Zip/Postal Code', example: '00100' })
    @IsOptional()
    @IsString()
    zipCode?: string;

    @ApiPropertyOptional({ description: 'Country', example: 'Kenya' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: 'Geographic coordinates [longitude, latitude]', example: [36.8219, -1.2921], type: [Number] })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber({}, { each: true })
    coordinates?: [number, number];
}

export class CreateOrganizationDto {
    @ApiProperty({ description: 'The full name of the organization', example: 'Acme Events Inc.' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'A unique short code for the organization', example: 'ACMEV' })
    @IsString()
    @IsNotEmpty()
    org_code: string;

    @ApiPropertyOptional({ description: 'URL to the organization\'s logo', example: 'https://example.com/logo.png' })
    @IsOptional()
    @IsUrl()
    logoUrl?: string;

    @ApiPropertyOptional({ description: 'KRA PIN or equivalent tax identification number', example: 'A123456789Z' })
    @IsOptional()
    @IsString()
    kraPin?: string;

    @ApiPropertyOptional({ description: 'Main contact phone number for the organization', example: '+254712345678' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ description: 'Main contact email for the organization', example: 'info@acmeevents.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Physical address of the organization', example: '123 Event Street, Nairobi' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ description: 'Official website URL', example: 'https://www.acmeevents.com' })
    @IsOptional()
    @IsUrl()
    websiteUrl?: string;

    @ApiPropertyOptional({ description: 'Name of the primary contact person', example: 'Jane Doe' })
    @IsOptional()
    @IsString()
    primaryContact?: string;

    @ApiPropertyOptional({ enum: OrganizationStatus, description: 'Current operational status of the organization', example: OrganizationStatus.PENDING_APPROVAL, default: OrganizationStatus.PENDING_APPROVAL })
    @IsOptional()
    @IsEnum(OrganizationStatus)
    status?: OrganizationStatus = OrganizationStatus.PENDING_APPROVAL;

    @ApiPropertyOptional({ description: 'Boolean flag to quickly enable/disable the organization', example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiPropertyOptional({ description: 'Date when the organization\'s subscription/account expires (ISO 8601 format)', example: '2025-12-31T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    expiry_date?: Date;

    @ApiPropertyOptional({ description: 'Location details of the organization', type: CreateLocationDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateLocationDto)
    location?: CreateLocationDto;

    @ApiPropertyOptional({ description: 'Flag if STK Push is enabled', example: false })
    @IsOptional()
    @IsBoolean()
    hasStkPush?: boolean;

    @ApiPropertyOptional({ description: 'API ID for STK Push integration', example: 'stk_api_key_123' })
    @IsOptional()
    @IsString()
    stkPushApiId?: string;

    @ApiPropertyOptional({ description: 'Bank payment details', type: [CreateBankPaymentDetailsDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateBankPaymentDetailsDto)
    bankPaymentDetails?: CreateBankPaymentDetailsDto[];

    @ApiPropertyOptional({ description: 'M-Pesa payment details', type: [CreateMpesaPaymentDetailsDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateMpesaPaymentDetailsDto)
    mpesaPaymentDetails?: CreateMpesaPaymentDetailsDto[];

    @ApiProperty({ description: 'The ID of the user who will own this organization. This should be provided by the system, not the client.', example: '60c72b2f9b1d4c001c8e4a01' })
    @IsMongoId()
    @IsNotEmpty()
    ownerId: string; // This will typically be set by the controller based on the authenticated user.
}



