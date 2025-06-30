import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';
import { ProductCategory } from '../../product-category/entities/product-category.entity';
import {
    ProductType,
    VariationAttribute,
    VariationOption,
} from '../interfaces/product.interfaces';
import { VariationAttributeSchemaFactory } from './variation-attribute.entity';
import { VariationOptionSchemaFactory } from './variation-option.entity';
import { VariationSchema, Variation } from './variation.entity';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product extends BaseDocument {
    @Prop({
        type: String,
        enum: Object.values(ProductType),
        required: true,
        default: ProductType.SIMPLE,
    })
    productType: ProductType;

    @Prop({ required: true, trim: true, index: true })
    name: string;

    @Prop({ required: false, trim: true })
    description?: string;

    @Prop({
        type: Types.ObjectId,
        ref: 'ProductCategory',
        required: true,
        index: true,
    })
    productCategoryId: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    })
    organizationId: Types.ObjectId;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: true })
    isTrackable: boolean;

    // --- Fields for SIMPLE products ---
    // These are optional because they are only used when productType is 'simple'.
    @Prop({ required: false, trim: true })
    sku?: string;

    @Prop({ required: false, min: 0 })
    price?: number;

    @Prop({ required: false, min: 0 })
    cost?: number;

    @Prop({ required: false, type: Number })
    quantity?: number;

    @Prop({ required: false, trim: true })
    imageUrl?: string;

    // --- Fields for VARIABLE products ---
    // These are optional and will only be present when productType is 'variable'.
    @Prop({ type: [VariationOptionSchemaFactory], default: undefined })
    variationOptions?: VariationOption[];

    @Prop({ type: [VariationSchema], default: undefined })
    variations?: Variation[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Index for simple products: ensures SKU is unique per organization.
// I'm using a partial filter to only apply this index to simple products.
ProductSchema.index(
    { organizationId: 1, sku: 1 },
    {
        unique: true,
        partialFilterExpression: {
            sku: { $exists: true },
            productType: ProductType.SIMPLE,
        },
    },
);

// Index for variable products to speed up lookups within the variations array.
// Note: Uniqueness for variation SKUs within a single product document must be
// enforced in the application logic (service layer) before saving.
ProductSchema.index({ 'variations.sku': 1 });

// --- End of change
