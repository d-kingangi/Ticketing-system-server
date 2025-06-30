import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * DTO for updating an existing product.
 * It extends the CreateProductDto, making all fields optional.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
