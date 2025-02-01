// models/Settings.ts
import mongoose from 'mongoose';

export interface ISettings extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;
  tagline?: string;
  siteIcon?: string;
  newUserRole: string;
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
}

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tagline: String,
  siteIcon: String,
  newUserRole: { type: String, required: true, default: 'Subscriber' },
  language: { type: String, required: true, default: 'en' },
  timeZone: { type: String, required: true, default: 'UTC' },
  dateFormat: { type: String, required: true, default: 'F j, Y' },
  timeFormat: { type: String, required: true, default: 'g:i a' },
}, {
  timestamps: true
});

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);