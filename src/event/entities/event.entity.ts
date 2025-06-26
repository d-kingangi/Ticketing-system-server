import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseDocument } from '../../database/base.schema'; // Import the BaseDocument

export enum EventStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
}

export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true }) // Ensure timestamps are enabled for Event as well
export class Event extends BaseDocument { // Extend BaseDocument
    @Prop({ required: true })
    userId: string; // Reference to an Organization/Client

    @Prop({ required: true })
    organizationId: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: [String], required: true })
    organizers: string[];

    @Prop({ required: true })
    categoryId: string;

    @Prop({
        type: {
            name: { type: String, required: true },
            address: { type: String, required: true },
            city: { type: String, required: true },
            coordinates: { type: [Number], required: false }, // [longitude, latitude]
        },
        required: true,
    })
    location: {
        name: string;
        address: string;
        city: string;
        coordinates?: [number, number];
    };

    @Prop({ required: true })
    startDateTime: Date;

    @Prop({ required: true })
    endDateTime: Date;

    @Prop({ required: true })
    featuredImage: string;

    @Prop({ type: [String], required: false })
    galleryImages?: string[];

    /**
     * New: An optional field for social media links.
     * This is a flexible key-value store for various social platforms.
     * Example: { "twitter": "https://twitter.com/event", "facebook": "https://facebook.com/event" }
     */
    @Prop({
        type: Object,
        required: false,
        default: {},
    })
    socialMediaLinks?: Record<string, string>;

    @Prop({ type: String, enum: EventStatus, default: EventStatus.DRAFT })
    status: EventStatus;

    @Prop({ default: true })
    isPublic: boolean;

    @Prop({ type: Number, required: false })
    maxAttendees?: number;

    // createdAt and updatedAt are inherited from BaseDocument due to `timestamps: true`
    // @Prop({ default: Date.now }) createdAt: Date;
    // @Prop({ default: Date.now }) updatedAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);