import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file';
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  deletedBy: Schema.Types.ObjectId[]; // 🔹 user nào đã xoá message cho riêng họ
  isDeletedForEveryone: boolean;
}

const MessageSchema: Schema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeletedForEveryone: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
