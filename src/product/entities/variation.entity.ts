import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { VariationAttribute } from '../interfaces/product.interfaces';
import { VariationAttributeSchemaFactory } from './variation-attribute.entity';

/**
 * I've extracted the Variation schema into its own file for clarity.
 * This represents a specific variant of a product, e.g., a "Red, Medium" T-shirt.
 * It has its own _id so it can be uniquely referenced in orders or carts.
 */
@Schema({ _id: true, timestamps: false })
export class Variation {
    @Prop({ type: [VariationAttributeSchemaFactory], required: true })
    attributes: VariationAttribute[];

    @Prop({ required: true, trim: true })
    sku: string;

    @Prop({ required: true, min: 0 })
    price: number;

    @Prop({ type: Number, min: 0, default: 0 })
    cost?: number;

    @Prop({ type: Number, default: 0 })
    quantity: number;

    @Prop({ required: false, trim: true })
    imageUrl?: string;

    /**
 * The sale price of this specific variation.
 */
    @Prop({ required: false, min: 0 })
    salePrice?: number;

    /**
     * The date when the sale price for this variation becomes active.
     */
    @Prop({ required: false })
    saleStartDate?: Date;

    /**
     * The date when the sale price for this variation expires.
     */
    @Prop({ required: false })
    saleEndDate?: Date;
}

export const VariationSchema = SchemaFactory.createForClass(Variation);
