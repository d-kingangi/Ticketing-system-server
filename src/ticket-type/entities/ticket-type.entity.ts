import { Prop, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema, Types } from "mongoose";
import { BaseDocument } from "src/database/base.schema";

export enum SupportedCurrencies {
    KES = 'KES',
    USD = 'USD',
}

export enum DiscountType {
    NONE = 'none',
    FIXED_AMOUNT = 'fixed_amount',
    PERCENTAGE = 'percentage',
}

export type TicketTypeDocument = HydratedDocument<TicketType>;

// @Schema({ timestamps: true }) // Ensure timestamps are automatically managed (createdAt, updatedAt)
export class TicketType extends BaseDocument {
    @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
    eventId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
    organizationId: Types.ObjectId;

    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ trim: true })
    description?: string; // Made optional as it might not always be needed

    @Prop({ required: true, min: 0 })
    price: number;

    @Prop({ type: String, enum: SupportedCurrencies, required: true })
    currency: SupportedCurrencies;

    @Prop({ required: true, min: 0 })
    quantity: number;

    @Prop({ default: 0, min: 0 })
    quantitySold: number;

    @Prop({ required: true })
    salesStartDate: Date;

    @Prop({ required: true })
    salesEndDate: Date;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isRefundable: boolean;

    @Prop({ default: 1, min: 1 })
    minPurchaseQuantity: number;

    @Prop({ min: 1 })
    maxPurchaseQuantity?: number;

    @Prop({ min: 0, default: 0 })
    displayOrder: number;

    @Prop({ default: false })
    isHidden: boolean;

    @Prop({ default: null })
    availableUntil?: Date;

    @Prop({ min: 1 })
    purchaseLimitPerUser?: number;

    @Prop({ type: String, enum: DiscountType, default: DiscountType.NONE })
    discountType: DiscountType;

    @Prop({ type: Number, min: 0, default: 0 })
    discountValue: number;

    @Prop({ trim: true })
    discountCode?: string;

    @Prop({ type: Number, min: 1 })
    minTicketsForDiscount?: number;

    @Prop({ type: Number, min: 0 })
    maxDiscountAmount?: number;

    // --- Inherited from BaseDocument ---
    // isDeleted: boolean;
    // createdAt: Date;
    // updatedAt: Date;
    // updatedBy: string;
}

export const TicketTypeSchema = SchemaFactory.createForClass(TicketType);

// --- Schema Indexes (for performance) ---
TicketTypeSchema.index({ eventId: 1 });
TicketTypeSchema.index({ organizationId: 1 });
TicketTypeSchema.index({ salesStartDate: 1, salesEndDate: 1 });
TicketTypeSchema.index({ isActive: 1 });
TicketTypeSchema.index({ category: 1 });

