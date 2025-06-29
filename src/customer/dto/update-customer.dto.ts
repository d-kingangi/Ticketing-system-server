import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * DTO for updating an existing customer.
 * It extends the CreateCustomerDto, making all fields optional.
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
