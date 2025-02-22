// src/models/User.ts
import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  username: string;
  name: string;
  email: string;
  password: string;
  phoneNumber?: string | null; // Allow phoneNumber to be null
  role: number;
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  role: { type: Number, required: true },
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export { userSchema };