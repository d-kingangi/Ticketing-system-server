import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { VariationAttribute } from '../interfaces/product.interfaces';

/**
 * I've created this file to isolate the schema for a single product variation attribute.
 * It's an embedded document, so it does not have its own _id.
 */
@Schema({ _id: false })
export class VariationAttributeSchema implements VariationAttribute {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: true, trim: true })
    value: string;
}

export const VariationAttributeSchemaFactory = SchemaFactory.createForClass(VariationAttributeSchema);
