import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Start of change: I've defined a specific response DTO for the address for consistency.
class AddressResponseDto {
    @ApiPropertyOptional({ description: 'Street address', example: '123 Main St' })
    street?: string;

    @ApiPropertyOptional({ description: 'City', example: 'Nairobi' })
    city?: string;

    @ApiPropertyOptional({ description: 'State or Province', example: 'Nairobi County' })
    state?: string;

    @ApiPropertyOptional({ description: 'ZIP or Postal Code', example: '00100' })
    zipCode?: string;

    @ApiPropertyOptional({ description: 'Country', example: 'Kenya' })
    country?: string;
}
// --- End of change

export class CustomerResponseDto {
    @ApiProperty({
        description: 'Unique identifier for the customer',
        example: '654a3b2c1d0e9f8a7b6c5d4e',
    })
    id: string;

    @ApiProperty({
        description: 'ID of the organization this customer belongs to',
        example: '654a3b2c1d0e9f8a7b6c5d4f',
    })
    organizationId: string;

    @ApiProperty({ description: "Customer's full name", example: 'John Doe' })
    fullName: string;

    @ApiProperty({
        description: "Customer's email address",
        example: 'john.doe@example.com',
    })
    email: string;

    @ApiProperty({
        description: "Customer's phone number",
        example: '+254712345678',
    })
    phone: string;

    @ApiPropertyOptional({
        type: AddressResponseDto,
        description: "Customer's physical address",
    })
    address?: AddressResponseDto;

    @ApiProperty({ description: "Customer's credit limit", example: 50000 })
    creditLimit: number;

    @ApiProperty({
        description: "Customer's current due credit amount",
        example: 15000,
    })
    dueCreditAmount: number;

    @ApiProperty({
        description: 'Indicates if the customer account is active',
        example: true,
    })
    isActive: boolean;

    @ApiPropertyOptional({
        description: 'Additional notes about the customer',
        example: 'VIP Customer',
    })
    notes?: string;

    @ApiProperty({
        description: 'ID of the user who registered the customer',
        example: '654a3b2c1d0e9f8a7b6c5d41',
    })
    registeredBy: string;

    @ApiProperty({
        description: 'Timestamp of customer creation',
        example: '2023-11-01T12:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Timestamp of last customer update',
        example: '2023-11-01T12:30:00.000Z',
    })
    updatedAt: Date;
}
