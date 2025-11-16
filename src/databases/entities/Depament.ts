import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  description?: string;
  leader?: mongoose.Types.ObjectId; // User
  staffs: mongoose.Types.ObjectId[]; // List of staff (User)
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true },
    description: { type: String },
    leader: { type: Schema.Types.ObjectId, ref: 'User' },
    staffs: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
