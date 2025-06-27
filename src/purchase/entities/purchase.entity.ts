import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose'; // Import Types for ObjectId
import { BaseDocument } from '../../database/base.schema'; // Corrected import path for BaseDocument
import { SupportedCurrencies } from '../../ticket-type/entities/ticket-type.entity'; // Import SupportedCurrencies from TicketType module

export enum PaymentStatus {
  PENDING = 'pending', // Payment initiated but not yet confirmed
  COMPLETED = 'completed', // Payment successfully received
  FAILED = 'failed', // Payment attempt failed
  REFUNDED = 'refunded', // Payment has been fully or partially refunded
  CANCELLED = 'cancelled', // Purchase was cancelled before payment completion
}


@Schema({ _id: false })
export class PurchaseTicketItem {
  @Prop({ type: Types.ObjectId, ref: 'TicketType', required: true })
  ticketTypeId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number; // The price per ticket *after* any applicable discount.

  @Prop({ required: true, default: 0 })
  discountAmount: number;
}

export const PurchaseTicketItemSchema = SchemaFactory.createForClass(PurchaseTicketItem);

export type PurchaseDocument = HydratedDocument<Purchase>;

@Schema({ timestamps: true }) // Ensure createdAt and updatedAt are automatically managed
export class Purchase extends BaseDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: [PurchaseTicketItemSchema], required: true })
  tickets: PurchaseTicketItem[];


  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: Types.ObjectId, ref: 'Discount', required: false })
  appliedDiscountId?: Types.ObjectId;

  @Prop({ required: false, default: 0 })
  discountAmountSaved?: number;

  @Prop({ type: String, enum: SupportedCurrencies, required: true })
  currency: SupportedCurrencies;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ required: true, trim: true })
  paymentMethod: string;

  @Prop({
    type: {
      transactionId: { type: String, required: false, trim: true }, // Unique ID from the payment gateway
      paymentDate: { type: Date, required: false }, // Date and time payment was confirmed
      paymentReference: { type: String, required: false, trim: true }, // User-facing payment reference (e.g., M-Pesa code)
      paymentGatewayResponse: { type: Object, required: false }, // Raw response from payment gateway for auditing
      paymentProvider: { type: String, required: false, trim: true }, // e.g., "Safaricom M-Pesa", "Stripe", "PayPal"
      paymentChannel: { type: String, required: false, trim: true }, // e.g., "M-Pesa Express", "Card (Visa)", "Bank Transfer"
    },
  })
  paymentDetails?: { // Made optional as it might not be present for pending/failed payments
    transactionId?: string;
    paymentDate?: Date;
    paymentReference?: string;
    paymentGatewayResponse?: Record<string, any>;
    paymentProvider?: string;
    paymentChannel?: string;
  };

  @Prop({ default: false })
  ticketsGenerated: boolean;

  // @Prop({ trim: true })
  // ipAddress?: string;

  // @Prop({ trim: true })
  // userAgent?: string;

  // @Prop({ trim: true })
  // notes?: string;

  @Prop({ default: 0, min: 0 })
  refundAmount: number;

  @Prop({
    type: [
      {
        refundId: { type: String, required: true, trim: true }, // Unique ID for the refund transaction
        amount: { type: Number, required: true, min: 0 }, // Amount refunded in this specific transaction
        refundDate: { type: Date, required: true }, // Date of the refund
        reason: { type: String, trim: true }, // Reason for the refund
        processedBy: { type: Types.ObjectId, ref: 'User' }, // User who processed the refund
      },
    ],
    default: [],
  })
  refunds: {
    refundId: string;
    amount: number;
    refundDate: Date;
    reason?: string;
    processedBy?: Types.ObjectId;
  }[];

  // --- Inherited from BaseDocument ---
  // isDeleted: boolean; // Indicates if the purchase record itself is soft-deleted
  // createdAt: Date;
  // updatedAt: Date;
  // updatedBy: string;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);

PurchaseSchema.index({ buyerId: 1 });
PurchaseSchema.index({ eventId: 1 });
PurchaseSchema.index({ organizationId: 1 });
PurchaseSchema.index({ paymentStatus: 1 });
