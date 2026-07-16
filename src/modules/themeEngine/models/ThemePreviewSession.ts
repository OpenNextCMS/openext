import { Schema, type Connection, type Model, type Document, type Types } from 'mongoose';

/**
 * §1.3 `theme_preview_sessions` collection — TTL-expired by MongoDB itself
 * (`expireAfterSeconds: 0` on an absolute `expiresAt` Date), so no cron/manual
 * cleanup job is needed.
 *
 * Collection namespaced `theme_engine_preview_sessions`, matching the same
 * convention as `models/Theme.ts` / `models/ThemeSettings.ts`.
 */
export interface IThemePreviewSessionDocument extends Document {
  token: string;
  themeSlug: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

const ThemePreviewSessionSchema = new Schema<IThemePreviewSessionDocument>(
  {
    token: { type: String, required: true },
    themeSlug: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'theme_engine_preview_sessions' }
);

ThemePreviewSessionSchema.index({ token: 1 }, { unique: true });
// MongoDB's background TTL monitor deletes a document once `expiresAt` is in
// the past — `expireAfterSeconds: 0` means "expire exactly at the stored date".
ThemePreviewSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function getEngineThemePreviewSessionModel(pageDb: Connection): Model<IThemePreviewSessionDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.ThemeEnginePreviewSession as Model<IThemePreviewSessionDocument>) ||
    pageDb.model<IThemePreviewSessionDocument>('ThemeEnginePreviewSession', ThemePreviewSessionSchema)
  );
}

export { ThemePreviewSessionSchema };
