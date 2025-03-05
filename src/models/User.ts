// src/models/User.ts
import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  username: string;
  email: string;
  password: string;
  phoneNumber?: string | null; // Allow phoneNumber to be null
  role: number;
  // NEW profile fields added to User
  firstName?: string;
  lastName?: string;
  nickname?: string;
  displayName?: string;
  website?: string;
  bio?: string;
  active: boolean;
  timestamps: Date; // Add this line
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  role: { type: Number, required: true },
  // NEW profile fields
  firstName: { type: String },
  lastName: { type: String },
  nickname: { type: String },
  displayName: { type: String },
  website: { type: String },
  bio: { type: String },
  active: { type: Boolean, default: true },  // Add this line
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export { userSchema };