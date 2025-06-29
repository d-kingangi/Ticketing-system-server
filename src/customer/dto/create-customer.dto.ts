import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    IsOptional,
    IsPhoneNumber,
    MinLength,
    ValidateNested,
    IsNumber,
    Min,
    IsBoolean,
} from 'class-validator';

// --- Start of change: I've defined a nested DTO for the address to ensure structured and valid input.
class CreateAddressDto {
    @ApiPropertyOptional({ description: 'Street address', example: '123 Main St' })
    @IsOptional()
    @IsString()
    street?: string;

    @ApiPropertyOptional({ description: 'City', example: 'Nairobi' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ description: 'State or Province', example: 'Nairobi County' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional({ description: 'ZIP or Postal Code', example: '00100' })
    @IsOptional()
    @IsString()
    zipCode?: string;

    @ApiPropertyOptional({ description: 'Country', example: 'Kenya' })
    @IsOptional()
    @IsString()
    country?: string;
}
// --- End of change

export class CreateCustomerDto {
    @ApiProperty({
        description: "Customer's full name",
        example: 'John Doe',
        minLength: 3,
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    fullName: string;

    @ApiProperty({
        description: "Customer's email address",
        example: 'john.doe@example.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: "Customer's phone number",
        example: '+254712345678',
    })
    @IsNotEmpty()
    @IsPhoneNumber(null) // Using null allows any region's phone number format
    phone: string;

    // --- Start of change: I've added validation for the nested address object.
    @ApiPropertyOptional({
        type: CreateAddressDto,
        description: "Customer's physical address",
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAddressDto)
    address?: CreateAddressDto;
    // --- End of change

    @ApiPropertyOptional({
        description: "Customer's credit limit",
        example: 50000,
        minimum: 0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    creditLimit?: number = 0;

    @ApiPropertyOptional({
        description: "Customer's status",
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiPropertyOptional({
        description: 'Additional notes about the customer',
        example: 'VIP Customer',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
