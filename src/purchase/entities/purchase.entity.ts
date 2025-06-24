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

export type PurchaseDocument = HydratedDocument<Purchase>;

@Schema({ timestamps: true }) // Ensure createdAt and updatedAt are automatically managed
export class Purchase extends BaseDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({
    type: [
      {
        ticketTypeId: { type: Types.ObjectId, ref: 'TicketType', required: true }, // Reference to the specific TicketType
        quantity: { type: Number, required: true, min: 1 }, // Quantity of this ticket type purchased
        unitPrice: { type: Number, required: true, min: 0 }, // Price per unit of this ticket type at the time of purchase
        // Suggested: Add discount details per line item if applicable
        discountApplied: { type: Boolean, default: false },
        discountDetails: {
          type: {
            type: String, // e.g., 'fixed_amount', 'percentage'
            value: Number,
            code: String, // The discount code used for this line item
          },
          required: false,
        },
      },
    ],
    required: true,
  })
  tickets: {
    ticketTypeId: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    discountApplied?: boolean;
    discountDetails?: {
      type: string;
      value: number;
      code?: string;
    };
  }[];


  @Prop({ required: true, min: 0 })
  totalAmount: number;

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

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ trim: true })
  notes?: string;

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

// --- Schema Indexes (for performance) ---
PurchaseSchema.index({ buyerId: 1 }); // Fast lookup of purchases by buyer
PurchaseSchema.index({ eventId: 1 }); // Fast lookup of purchases by event
PurchaseSchema.index({ organizationId: 1 }); // Fast lookup of purchases by organization
PurchaseSchema.index({ paymentStatus: 1 }); // Efficient filtering by payment status
PurchaseSchema.index({ 'paymentDetails.transactionId': 1 }, { sparse: true }); // Index for payment gateway transaction ID
PurchaseSchema.index({ ticketsGenerated: 1 }); // For finding purchases that need ticket generation
