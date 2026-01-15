import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface DeviceInfo {
  platform: string;
  deviceId: string;
  appVersion?: string;
}

export interface GuestDivinationDocument extends Document {
  guestId: string;
  hexagram: any;
  device: DeviceInfo;
  ip?: string;
  createdAt: Date;
}

@Schema({ collection: 'guest_divinations' })
export class GuestDivination {
  @Prop({ required: true, index: true })
  guestId: string;

  @Prop({ type: Object, required: true })
  hexagram: any;

  @Prop({ type: Object, required: true })
  device: DeviceInfo;

  @Prop()
  ip: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const GuestDivinationSchema = SchemaFactory.createForClass(GuestDivination);

// 创建索引
GuestDivinationSchema.index({ guestId: 1, createdAt: -1 });
GuestDivinationSchema.index({ createdAt: -1 });