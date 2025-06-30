import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type ProductCategoryDocument = HydratedDocument<ProductCategory>;

@Schema({ timestamps: true, collection: 'productcategories' })
export class ProductCategory extends BaseDocument {
    /**
     * The name of the product category (e.g., "Beverages", "Apparel").
     */
    @Prop({
        required: true,
        trim: true,
    })
    name: string;

    /**
     * An optional description for the product category.
     */
    @Prop({
        required: false,
        trim: true,
    })
    description?: string;

    /**
     * A reference to the organization that owns this category.
     * This is crucial for data isolation in a multi-tenant system.
     */
    @Prop({
        type: Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    })
    organizationId: Types.ObjectId;

    /**
     * A flag to easily activate or deactivate a category.
     * Defaults to true.
     */
    @Prop({ default: true })
    isActive: boolean;
}

export const ProductCategorySchema = SchemaFactory.createForClass(ProductCategory);

// I've added a compound index to ensure that a category name is unique
// within the scope of a single organization. This prevents an organization
// from creating two categories with the same name.
ProductCategorySchema.index({ organizationId: 1, name: 1 }, { unique: true });
