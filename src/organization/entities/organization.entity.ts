import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema'; // Import the BaseDocument
import { UserRole } from '../../auth/schema/user.schema'; // Assuming UserRole is defined here


/**
 * Represents bank account details for an organization.
 */
@Schema({ _id: false }) // _id: false means Mongoose won't create an _id for this subdocument
export class BankPaymentDetails {
  @Prop({ required: true, trim: true })
  accountNumber: string;

  @Prop({ required: true, trim: true })
  accountName: string;

  @Prop({ required: true, trim: true })
  bankName: string;

  @Prop({ trim: true })
  bankBranch?: string; // Optional: Branch name of the bank
}

/**
 * Represents a social media link for an organization.
 * This sub-schema allows for storing various social media profiles in a structured way.
 */
@Schema({ _id: false }) // _id: false as it's a subdocument
export class SocialMediaLink {
  /**
   * The social media platform (e.g., 'Facebook', 'Twitter', 'Instagram').
   */
  @Prop({ required: true, trim: true })
  platform: string;

  /**
   * The full URL to the organization's profile on the platform.
   */
  @Prop({ required: true, trim: true })
  url: string;
}


/**
 * Represents M-Pesa payment details for an organization.
 */
@Schema({ _id: false }) // _id: false means Mongoose won't create an _id for this subdocument
export class MpesaPaymentDetails {
  @Prop({ trim: true })
  paybillNumber?: string; // For M-Pesa Paybill

  @Prop({ trim: true })
  accountNumber?: string; // Account number for Paybill (often the invoice number or customer ID)

  @Prop({ trim: true })
  tillNumber?: string; // For M-Pesa Buy Goods and Services (Till Number)
}



export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_APPROVAL = 'pending_approval',
  SUSPENDED = 'suspended',
}

/**
 * Represents an Organization in the ticketing system.
 * Organizations own events and manage their own set of users (agents).
 */
export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ timestamps: true }) // Ensure timestamps are automatically managed (createdAt, updatedAt)
export class Organization extends BaseDocument {
  // --- Core Organization Details ---

  @Prop({ required: true, trim: true })
  name: string; // The full name of the organization (e.g., "Acme Events Inc.")

  @Prop({ required: true, unique: true, trim: true })
  org_code: string; // A unique short code for the organization (e.g., "ACMEV")

  @Prop({ trim: true })
  logoUrl?: string; // URL to the organization's logo

  @Prop({ trim: true })
  kraPin?: string; // KRA PIN or equivalent tax identification number (optional)

  @Prop({ trim: true })
  phone?: string; // Main contact phone number for the organization

  @Prop({ unique: true, sparse: true, trim: true }) // Add sparse index for optional unique fields
  email?: string; // Main contact email for the organization

  @Prop({ trim: true })
  address?: string; // Physical address of the organization

  @Prop({ trim: true })
  websiteUrl?: string; // Official website URL

  @Prop({ type: [SocialMediaLink], default: [] }) // Define the property as an array of SocialMediaLink subdocuments
  socialMediaLinks?: SocialMediaLink[];

  @Prop({ trim: true })
  primaryContact?: string; // Name of the primary contact person

  @Prop({ type: String, enum: OrganizationStatus, default: OrganizationStatus.PENDING_APPROVAL })
  status: OrganizationStatus; // Current operational status of the organization

  @Prop({ default: true })
  isActive: boolean; // Boolean flag to quickly enable/disable the organization

  @Prop({ type: Date })
  expiry_date?: Date; // Date when the organization's subscription/account expires (optional)

  @Prop({ default: false })
  isVerified?: boolean;

  // --- Location Details ---
  // Using a flexible object for location. Consider a dedicated Location schema for more structure.
  @Prop({ type: Object })
  location?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };

  // --- Payment Gateway Specifics (consider making this more generic) ---
  @Prop()
  hasStkPush?: boolean; // Flag if STK Push is enabled (consider moving to MpesaPaymentDetails)

  @Prop()
  stkPushApiId?: string; // API ID for STK Push integration (consider moving to MpesaPaymentDetails)

  // --- Payment Details (Nested Schemas) ---
  @Prop({ type: [BankPaymentDetails], default: [] })
  bankPaymentDetails?: BankPaymentDetails[]; // Array to support multiple bank accounts

  @Prop({ type: [MpesaPaymentDetails], default: [] })
  mpesaPaymentDetails?: MpesaPaymentDetails[]; // Array to support multiple M-Pesa options

  // --- Relationships and Audit ---

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId; // Reference to the User who created/owns this organization

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  users: Types.ObjectId[]; // Array of User IDs associated with this organization (e.g., agents)

  // --- Additional Fields (Inherited from BaseDocument) ---
  // @Prop({ default: false }) isDeleted: boolean;
  // @Prop({ default: Date.now }) createdAt: Date;
  // @Prop({ default: Date.now, required: false }) updatedAt: Date;
  // @Prop({ default: '', required: false }) updatedBy: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// --- Schema Indexes (for performance) ---
OrganizationSchema.index({ org_code: 1 }, { unique: true });
OrganizationSchema.index({ email: 1 }, { unique: true, sparse: true });
OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ isActive: 1 });


OrganizationSchema.pre('save', function (next) {
  if (this.isModified() && this.updatedBy === undefined) {
    this.updatedBy = this.updatedBy || 'system'; // Default to 'system' or a placeholder
  }
  next();
});

