// models/Settings.ts
import mongoose from 'mongoose';

export interface ISettings extends mongoose.Document {
  // Removed userId field
  siteTitle: string;
  tagline?: string;
  siteIcon?: string;
  language: string;
  /** When true, public site can serve multiple content locales. */
  multilingualEnabled?: boolean;
  /** Locales available on the public site (must include `language`). */
  enabledLanguages?: string[];
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  themes: { name: string; isActive: boolean }[];
  config: { key: string; value: string | number }[];
  aiConfig?: {
    openrouterApiKey?: string;
    openrouterModel?: string;
    openrouterReviewModel?: string;
    aiMinQualityScore?: number;
  };
  /** Plugin-defined roles from api/roles.js, keyed by pluginId. */
  pluginUserTypes?: Record<string, unknown>;
  /** Plugin API permission catalogs, keyed by pluginId. */
  pluginPermissions?: Record<string, string[]>;
}

const settingsSchema = new mongoose.Schema(
  {
    // Removed userId field from schema definition
    siteTitle: { type: String, required: true },
    tagline: String,
    siteIcon: String,
    language: { type: String, required: true, default: 'en' },
    multilingualEnabled: { type: Boolean, default: false },
    enabledLanguages: { type: [String], default: ['en'] },
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
    aiConfig: {
      openrouterApiKey: String,
      openrouterModel: { type: String, default: 'google/gemini-2.5-flash' },
      openrouterReviewModel: { type: String, default: 'google/gemini-2.5-flash-lite' },
      aiMinQualityScore: { type: Number, default: 80 },
    },
    pluginUserTypes: { type: mongoose.Schema.Types.Mixed, default: undefined },
    pluginPermissions: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;
export { settingsSchema };
