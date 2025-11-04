import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatform extends Document {
  name: 'Facebook' | 'WhatsApp' | 'Instagram' | 'Telegram' | 'Twitter';
  status: 'connected' | 'disconnected';
  connectedAt?: Date;
  disconnectedAt?: Date;
  lastSync?: Date;
  accessToken?: string;
}

const PlatformSchema = new Schema<IPlatform>(
  {
    name: { type: String, required: true, unique: true },
    status: { type: String, enum: ['connected', 'disconnected'], default: 'disconnected' },
    connectedAt: Date,
    disconnectedAt: Date,
    lastSync: Date,
    accessToken: String,
  },
  { timestamps: true }
);

export default mongoose.model<IPlatform>('Platform', PlatformSchema);
