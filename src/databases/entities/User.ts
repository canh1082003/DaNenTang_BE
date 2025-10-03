import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  friends: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  role: string;
  verifyEmailToken: string;
  isVerifyEmail: boolean;
  isOnline: boolean;
  lastSeen: Date;
  psid?: string;
  tgid?: string;
  zaloId?: string;
  department?: 'sales' | 'support' | 'care';
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: {
      type: String,
      default:
        'https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg',
    },
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    role: { type: String, enum: ['user', 'admin', 'ai'], default: 'user' },
    verifyEmailToken: { type: String, require: false },
    isVerifyEmail: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
    psid: { type: String, unique: true, sparse: true },
    tgid: { type: String, unique: true, sparse: true },
    zaloId: { type: String, unique: true, sparse: true },
    department: {
      type: String,
      enum: ['sales', 'support', 'care'],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
