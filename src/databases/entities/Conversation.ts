import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  type: 'private' | 'group';
  name?: string;
  participants: mongoose.Types.ObjectId[];
  admin?: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    type: { type: String, enum: ['private', 'group'], required: true },
    name: { type: String }, // Tên nhóm chat
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);
