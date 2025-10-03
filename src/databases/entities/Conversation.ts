import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  type: 'private' | 'group';
  name?: string;
  participants: mongoose.Types.ObjectId[];
  admin?: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  assignedDepartment?: 'sales' | 'support' | 'care';
  leader?: mongoose.Types.ObjectId;
  assignedAgent?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedBy: mongoose.Types.ObjectId[];
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
    assignedDepartment: {
      type: String,
      enum: ['sales', 'support', 'care'],
      required: false,
    },
    leader: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);
