import mongoose, { Schema, Document } from 'mongoose';

/**
 * WebsitePreferences — the inputs and outcome of the first-time Website Setup
 * Wizard, stored per-tenant in the page DB (keyed by the user's id). Also acts
 * as the autosave store for an in-progress wizard (`draft: true`).
 *
 * The canonical "has this user finished onboarding" flag lives on the User
 * document (user DB); this record additionally captures the chosen options and
 * the slugs of the pages that were generated, for traceability and resume.
 */
export interface IWebsitePreferences extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  businessCategory: string;
  businessDescription: string;
  targetAudience?: string;
  location?: string;
  websiteType: string;
  headerTemplate: string;
  footerTemplate: string;
  theme: string;
  onboardingCompleted: boolean;
  /** True while the wizard is still in progress (autosave draft). */
  draft: boolean;
  /** Slug of the generated homepage, once generation completes. */
  homepageSlug?: string;
  /** Slugs of every page produced by generation (homepage + supporting). */
  generatedPageSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const WebsitePreferencesSchema = new Schema<IWebsitePreferences>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    businessName: { type: String, default: '' },
    businessCategory: { type: String, default: '' },
    businessDescription: { type: String, default: '' },
    targetAudience: { type: String, default: '' },
    location: { type: String, default: '' },
    websiteType: { type: String, default: '' },
    headerTemplate: { type: String, default: '' },
    footerTemplate: { type: String, default: '' },
    theme: { type: String, default: '' },
    onboardingCompleted: { type: Boolean, default: false },
    draft: { type: Boolean, default: true },
    homepageSlug: { type: String },
    generatedPageSlugs: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One preferences document per user.
WebsitePreferencesSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.WebsitePreferences ||
  mongoose.model<IWebsitePreferences>('WebsitePreferences', WebsitePreferencesSchema);
