import { Prop, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class BaseDocument extends Document {
    @Prop({ default: true })
    clientId: string;

    @Prop({ default: true })
    branchId: string;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now, required: false })
    updatedAt: Date;

    @Prop({ default: '', required: false })
    updatedBy: string;
}
