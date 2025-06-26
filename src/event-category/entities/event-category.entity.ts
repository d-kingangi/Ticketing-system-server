import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose'; // Import Types for ObjectId
import { BaseDocument } from '../../database/base.schema'; // Assuming BaseDocument provides common fields like isDeleted, updatedBy

export type EventCategoryDocument = HydratedDocument<EventCategory>;

@Schema({ timestamps: true, collection: 'eventcategories' })
export class EventCategory extends BaseDocument {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: false, trim: true })
    description?: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const EventCategorySchema = SchemaFactory.createForClass(EventCategory);

EventCategorySchema.index({ name: 1 }, { unique: true });


