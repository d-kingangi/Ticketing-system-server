// user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

// A more appropriate set of roles for a ticketing system
export enum UserRole {
  ADMIN = 'admin', // Manages the system, users, and settings
  AGENT = 'agent', // Responds to and manages tickets
  CUSTOMER = 'customer', // Creates tickets
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  // Virtual property to get the full name for convenience
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, select: false }) // Hide password from query results by default
  password: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  profileUrl?: string;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.CUSTOMER] })
  roles: UserRole[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean; // To track if the user's email is verified

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  // Fields for email verification
  @Prop({ type: String, select: false })
  verificationToken?: string;

  @Prop({ type: Date, select: false })
  verificationExpires?: Date;

  // Fields for password reset
  @Prop({ type: String, select: false })
  resetPasswordToken?: string;

  @Prop({ type: Date, select: false })
  resetPasswordExpires?: Date;

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  // These are managed by Mongoose's timestamps option, but defined here for TypeScript's benefit
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Define the virtual property for fullName
UserSchema.virtual('fullName').get(function (this: UserDocument) {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return '';
});

// Add indices for better query performance
UserSchema.index({ roles: 1 });
UserSchema.index({ isDeleted: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });
