import mongoose, { Schema, Document } from 'mongoose';

export interface IResponseStat extends Document {
  date: Date;
  totalReceived: number;
  totalResponded: number;
  responseRate: number; // auto computed
}

const ResponseStatSchema = new Schema<IResponseStat>(
  {
    date: { type: Date, required: true },
    totalReceived: { type: Number, default: 0 },
    totalResponded: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IResponseStat>('ResponseStat', ResponseStatSchema);
