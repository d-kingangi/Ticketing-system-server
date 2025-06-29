import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';
import { Organization } from '../../organization/entities/organization.entity'; // Note: Adjust path if necessary
import { User } from '../../auth/schema/user.schema'; // Note: Adjust path if necessary

export type CustomerDocument = HydratedDocument<Customer>;

// --- Start of change: I've defined an embedded schema for the address for better organization.
@Schema({ _id: false }) // _id: false because it's an embedded document
class Address {
    @Prop({ trim: true })
    street?: string;

    @Prop({ trim: true })
    city?: string;

    @Prop({ trim: true })
    state?: string;

    @Prop({ trim: true })
    zipCode?: string;

    @Prop({ trim: true })
    country?: string;
}

const AddressSchema = SchemaFactory.createForClass(Address);
// --- End of change

@Schema({ timestamps: true, collection: 'customers' })
export class Customer extends BaseDocument {
    // --- Start of change: I've defined the full Customer schema based on your requirements.

    @Prop({
        type: Types.ObjectId,
        ref: 'Organization', // A customer belongs to one organization.
        required: true,
        index: true,
    })
    organizationId: Types.ObjectId;

    @Prop({
        required: true,
        trim: true,
        lowercase: true,
        // Uniqueness is enforced by the compound index below (unique per organization).
    })
    email: string;

    @Prop({ required: true, trim: true })
    fullName: string;

    @Prop({ required: true, trim: true })
    phone: string;

    @Prop({ type: AddressSchema }) // Embed the address schema for structured address data.
    address?: Address;

    @Prop({
        type: Number,
        default: 0,
        description: 'The maximum amount of credit this customer is allowed.',
    })
    creditLimit: number;

    @Prop({
        type: Number,
        default: 0,
        description: 'The current outstanding credit amount owed by the customer.',
    })
    dueCreditAmount: number;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ required: false, trim: true })
    notes?: string;

    @Prop({
        type: Types.ObjectId,
        ref: 'User', // The user who registered this customer.
        required: true,
    })
    registeredBy: Types.ObjectId;

    // --- End of change
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Ensures that a customer's email is unique within a specific organization.
CustomerSchema.index({ organizationId: 1, email: 1 }, { unique: true });

// Optimizes lookups by phone number within an organization.
CustomerSchema.index({ organizationId: 1, phone: 1 });

