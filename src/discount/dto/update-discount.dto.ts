import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscountDto } from './create-discount.dto';

// UpdateDiscountDto inherits all properties from CreateDiscountDto and makes them optional.
export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}
