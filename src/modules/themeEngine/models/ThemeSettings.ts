import { Schema, type Connection, type Model, type Document, type Types } from 'mongoose';

/**
 * §1.2 `theme_settings` collection — exactly ONE document per tenant, `_id: "singleton"`.
 * This IS the DB-enforced single-active invariant: only one field can hold one
 * value, so there is no separate "clear all other active flags" step to race.
 *
 * Collection namespaced `theme_engine_settings` for the same reason as
 * `models/Theme.ts` — this tenant DB already has an unrelated `ThemeSettings`
 * model (blog design settings, `src/models/ThemeSettings.ts`, collection
 * `themesettings`) registered on the same connection; keep the two apart.
 */

export interface IThemeEngineSettingsDocument extends Omit<Document, '_id'> {
  _id: string;
  activeThemeSlug: string | null;
  /** Rollback target for a failed activation. */
  previousThemeSlug: string | null;
  activatedAt: Date | null;
  activatedBy: Types.ObjectId | null;
  /** slug -> theme-defined settings values. */
  perThemeSettings: Record<string, Record<string, unknown>>;
}

export const SINGLETON_ID = 'singleton';

const ThemeSettingsSchema = new Schema<IThemeEngineSettingsDocument>(
  {
    _id: { type: String, default: SINGLETON_ID },
    activeThemeSlug: { type: String, default: null },
    previousThemeSlug: { type: String, default: null },
    activatedAt: { type: Date, default: null },
    activatedBy: { type: Schema.Types.ObjectId, default: null },
    perThemeSettings: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: 'theme_engine_settings' }
);

export function getEngineThemeSettingsModel(pageDb: Connection): Model<IThemeEngineSettingsDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.ThemeEngineSettings as Model<IThemeEngineSettingsDocument>) ||
    pageDb.model<IThemeEngineSettingsDocument>('ThemeEngineSettings', ThemeSettingsSchema)
  );
}

export { ThemeSettingsSchema };
