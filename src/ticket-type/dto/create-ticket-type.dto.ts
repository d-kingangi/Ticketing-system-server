import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsEnum, IsDateString, IsBoolean } from "class-validator";
import { SupportedCurrency } from "src/shared/enum/supported-currency.enum";

export class CreateTicketTypeDto {
    @ApiProperty({ description: 'The ID of the event this ticket type belongs to.', example: '60c72b2f9b1d4c001c8e4a01' })
    @IsMongoId()
    @IsNotEmpty()
    eventId: string;

    // @ApiProperty({ description: 'The ID of the organization that owns the event.', example: '60c72b2f9b1d4c001c8e4a02' })
    // @IsMongoId()
    // @IsNotEmpty()
    // organizationId: string; // This will typically be set by the service based on the event's organizationId

    @ApiProperty({ description: 'Name of the ticket type (e.g., "VIP", "Regular", "Early Bird").', example: 'Regular Admission' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'A brief description of the ticket type.', example: 'Includes access to all general sessions.' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'The price of a single ticket of this type.', example: 50.00 })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    price: number;

    @ApiProperty({ description: 'The currency in which the ticket is priced.', enum: SupportedCurrency, example: SupportedCurrency.KES })
    @IsEnum(SupportedCurrency)
    @IsNotEmpty()
    currency: SupportedCurrency;

    @ApiProperty({ description: 'The total number of tickets of this type available for sale.', example: 100 })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    quantity: number;

        // CHANGE: Removed quantitySold. This is a derived value and should not be set on creation.

    // @ApiProperty({ description: 'The total number of tickets of this type available for sale.', example: 100 })
    // @IsNumber()
    // @Min(0)
    // @IsOptional()
    // quantitySold: number;

    @ApiProperty({ description: 'The date and time when sales for this ticket type begin (ISO 8601 format).', example: '2023-10-26T09:00:00Z' })
    @IsDateString()
    @IsNotEmpty()
    salesStartDate: Date;

    @ApiProperty({ description: 'The date and time when sales for this ticket type end (ISO 8601 format).', example: '2023-11-25T23:59:59Z' })
    @IsDateString()
    @IsNotEmpty()
    salesEndDate: Date;

    @ApiPropertyOptional({ description: 'Whether this ticket type is currently active and available for sale.', example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiPropertyOptional({ description: 'Whether tickets of this type can be refunded.', example: false, default: false })
    @IsOptional()
    @IsBoolean()
    isRefundable?: boolean = false;

    @ApiPropertyOptional({ description: 'The minimum number of tickets a user must purchase in a single transaction for this type.', example: 1, default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    minPurchaseQuantity?: number = 1;

    @ApiPropertyOptional({ description: 'The maximum number of tickets a user can purchase in a single transaction for this type.', example: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    maxPurchaseQuantity?: number;

    @ApiPropertyOptional({ description: 'The order in which to display this ticket type on the event page (lower numbers first).', example: 0, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    displayOrder?: number = 0;

    @ApiPropertyOptional({ description: 'If true, this ticket type won\'t be shown publicly but can be accessed via direct link/code.', example: false, default: false })
    @IsOptional()
    @IsBoolean()
    isHidden?: boolean = false;

    @ApiPropertyOptional({ description: 'Optional: Overrides salesEndDate for specific ticket types (ISO 8601 format).', example: '2023-11-15T17:00:00Z' })
    @IsOptional()
    @IsDateString()
    availableUntil?: Date;

    @ApiPropertyOptional({ description: 'Maximum number of tickets of this type a single user can purchase in total across all transactions.', example: 5 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    purchaseLimitPerUser?: number;
}
