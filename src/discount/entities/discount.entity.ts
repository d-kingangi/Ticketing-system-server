import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';
import { DiscountType } from '../enum/discount-type.enum';

export type DiscountDocument = HydratedDocument<Discount>;

@Schema({ timestamps: true, collection: 'discounts' })
export class Discount extends BaseDocument {
  /**
   * The unique, user-facing code to be redeemed.
   * e.g., "SUMMER2024", "VIPONLY"
   */
  @Prop({ required: true, trim: true, uppercase: true })
  code: string;

  /**
   * A description for administrative purposes.
   * e.g., "Summer marketing campaign for Instagram"
   */
  @Prop({ required: false, trim: true })
  description?: string;

  /**
   * The type of discount: fixed amount or percentage.
   */
  @Prop({ type: String, enum: DiscountType, required: true })
  discountType: DiscountType;

  /**
   * The value of the discount.
   * e.g., 15 for a percentage, 500 for a fixed amount.
   */
  @Prop({ required: true, min: 0 })
  discountValue: number;

  /**
   * The ID of the organization this discount belongs to.
   */
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  /**
   * The ID of the event this discount is associated with.
   */
  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  /**
   * An array of TicketType IDs this discount applies to.
   * If this array is empty, the discount applies to ALL ticket types for the event.
   * If it has one or more IDs, it ONLY applies to those specific ticket types.
   */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'TicketType' }], default: [] })
  applicableTicketTypeIds: Types.ObjectId[];

  /**
   * The total number of times this discount can be used across all purchases.
   * Optional: If not set, it can be used infinitely.
   */
  @Prop({ required: false, min: 1 })
  usageLimit?: number;

  /**
   * The number of times this discount has already been used.
   */
  @Prop({ required: true, default: 0, min: 0 })
  usageCount: number;

  /**
   * The date from which the discount is valid.
   */
  @Prop({ required: true })
  startDate: Date;

  /**
   * The date until which the discount is valid.
   */
  @Prop({ required: true })
  endDate: Date;

  /**
   * Whether the discount is currently active and can be redeemed.
   */
  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);

// Index to quickly find a discount by its code for a specific event.
DiscountSchema.index({ code: 1, eventId: 1 }, { unique: true });
DiscountSchema.index({ organizationId: 1 });
