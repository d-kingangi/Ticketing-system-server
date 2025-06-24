import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseDocument } from "src/database/base.schema";

export enum TicketStatus {
  VALID = 'valid', // Ticket is active and can be used
  USED = 'used', // Ticket has been scanned/redeemed at the event
  CANCELLED = 'cancelled', // Ticket was cancelled before use (e.g., by organizer)
  REFUNDED = 'refunded', // Ticket was refunded to the buyer
  EXPIRED = 'expired', // Ticket's validity period has passed (e.g., after event end)
  TRANSFERRED = 'transferred', // Ticket has been transferred to another user
}

export type TicketDocument = HydratedDocument<Ticket>;


@Schema({ timestamps: true }) // Ensure createdAt and updatedAt are automatically managed
export class Ticket extends BaseDocument {
  @Prop({ type: Types.ObjectId, ref: 'TicketType', required: true })
  ticketTypeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Purchase', required: true })
  purchaseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;


  @Prop({ type: String, enum: TicketStatus, default: TicketStatus.VALID })
  status: TicketStatus;

  /**
   * A unique, human-readable code for validating the ticket.
   * This can be printed on the ticket and manually entered.
   */
  @Prop({ required: true, unique: true, trim: true })
  ticketCode: string;

  /**
   * URL or path to the generated QR code image for this ticket.
   * Used for quick scanning at entry points.
   */
  @Prop({ required: true })
  qrCode: string;

  @Prop({ required: true, min: 0 })
  priceAtPurchase: number;

  @Prop({ required: true })
  currencyAtPurchase: string; // Could be SupportedCurrencies enum if you want to enforce it here

  @Prop()
  scannedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  scannedBy?: Types.ObjectId;

  @Prop()
  checkInLocation?: string;

  @Prop({ default: 0, min: 0 })
  redemptionAttempts: number;

  @Prop({ default: false })
  isTransferable: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  transferredTo?: Types.ObjectId;


  @Prop({ type: [{ from: Types.ObjectId, to: Types.ObjectId, date: Date }], default: [] })
  transferHistory: { from: Types.ObjectId; to: Types.ObjectId; date: Date }[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// --- Schema Indexes (for performance) ---
TicketSchema.index({ ticketCode: 1 }, { unique: true }); // Ensure ticketCode is unique and fast to query
TicketSchema.index({ ownerId: 1 }); // Fast lookup of tickets by owner
TicketSchema.index({ eventId: 1 }); // Fast lookup of tickets by event
TicketSchema.index({ ticketTypeId: 1 }); // Fast lookup of tickets by ticket type
TicketSchema.index({ purchaseId: 1 }); // Fast lookup of tickets by purchase
TicketSchema.index({ organizationId: 1 }); // Fast lookup of tickets by organization
TicketSchema.index({ status: 1 }); // Efficient filtering by ticket status
TicketSchema.index({ scannedAt: 1 });
