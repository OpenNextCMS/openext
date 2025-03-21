// models/Settings.ts
import mongoose from 'mongoose';

export interface ISettings extends mongoose.Document {
  // Removed userId field
  siteTitle: string;
  tagline?: string;
  siteIcon?: string;
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  themes: { name: string; isActive: boolean }[];
  config: { key: string; value: string | number }[];
}

const settingsSchema = new mongoose.Schema(
  {
    // Removed userId field from schema definition
    siteTitle: { type: String, required: true },
    tagline: String,
    siteIcon: String,
    language: { type: String, required: true, default: 'en' },
    timeZone: { type: String, required: true, default: 'UTC' },
    dateFormat: { type: String, required: true, default: 'F j, Y' },
    timeFormat: { type: String, required: true, default: 'g:i a' },
    themes: [
      {
        name: { type: String, required: true },
        isActive: { type: Boolean, default: false },
      },
    ],
    config: [
      {
        key: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true, default: '5mb' },
      },
    ],
  },
  { timestamps: true }
);

const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;
export { settingsSchema };
