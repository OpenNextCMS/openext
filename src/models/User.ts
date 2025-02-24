// src/models/User.ts
import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  username: string;
  name: string;
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
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
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
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export { userSchema };