import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { VariationOption } from '../interfaces/product.interfaces';

/**
 * I've moved the VariationOption schema into its own file.
 * This schema defines the available options for a variable product to help build UI selectors.
 * It's an embedded document, so it does not have its own _id.
 */
@Schema({ _id: false })
export class VariationOptionSchema implements VariationOption {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ type: [String], required: true })
    values: string[];
}

export const VariationOptionSchemaFactory = SchemaFactory.createForClass(VariationOptionSchema);
