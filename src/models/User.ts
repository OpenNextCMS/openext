// src/models/User.ts
import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  siteTitle: string;
  username: string;
  name: string;
  email: string;
  password: string;
  phoneNumber?: string | null; // Allow phoneNumber to be null
  role: 'admin' | 'user' | 'editor' | 'author';
}

const userSchema = new mongoose.Schema({
  siteTitle: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  role: { type: String, enum: ['admin', 'user', 'editor', 'author'], default: 'author' },
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export { userSchema };