import { Schema, type Connection, type Model, type Document, type Types } from 'mongoose';
import type {
  ThemeDocument as ThemeDocumentShape,
  ThemeInstallLogEntry,
  ThemeStatus,
} from '../types';

/**
 * §1.1 `themes` collection — Mongoose model.
 *
 * Bound to a passed `Connection` (per-tenant page DB), matching this repo's
 * existing `getXModel(pageDb)` pattern (see `src/utils/db.ts`).
 *
 * Collection name is deliberately namespaced `theme_engine_themes` rather than
 * the spec's literal `themes`: the pre-existing Theme Builder (`src/models/Theme.ts`,
 * Mongoose model name `Theme`) already occupies the default `themes` collection on
 * this same per-tenant connection, and stays live until this engine is fully wired
 * and that system is deleted (see the migration plan). Reusing `themes` here would
 * have both systems reading/writing the same collection with incompatible schemas
 * during the transition. Rename to `themes` in the deletion step once the legacy
 * model is gone, if an exact collection-name match to the spec is still wanted.
 */

export interface IThemeEngineThemeDocument
  extends Omit<ThemeDocumentShape, '_id' | 'installedBy'>,
    Document {
  installedBy: Types.ObjectId;
}

const InstallLogEntrySchema = new Schema<ThemeInstallLogEntry>(
  {
    step: { type: String, required: true },
    status: { type: String, enum: ['ok', 'warning', 'error'], required: true },
    message: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const THEME_STATUSES: ThemeStatus[] = ['installed', 'installing', 'failed', 'disabled'];

const ThemeSchema = new Schema<IThemeEngineThemeDocument>(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    description: { type: String },
    compatibleCmsVersion: { type: String, required: true },
    status: { type: String, enum: THEME_STATUSES, required: true, default: 'installing' },
    // Validated by ManifestParser/ThemeValidator before persistence; stored as Mixed
    // so the manifest's own evolving shape needs no schema migration here.
    manifest: { type: Schema.Types.Mixed, required: true },
    installPath: { type: String, required: true },
    checksum: { type: String, required: true },
    installedAt: { type: Date, required: true },
    installedBy: { type: Schema.Types.ObjectId, required: true },
    installLog: { type: [InstallLogEntrySchema], default: [] },
    assetHashes: {
      stylesheet: { type: String },
      script: { type: String },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: 'theme_engine_themes' }
);

ThemeSchema.index({ slug: 1 }, { unique: true });
ThemeSchema.index({ status: 1 });

/** Get the connection-bound model, reusing an existing registration if present. */
export function getEngineThemeModel(pageDb: Connection): Model<IThemeEngineThemeDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.ThemeEngineTheme as Model<IThemeEngineThemeDocument>) ||
    pageDb.model<IThemeEngineThemeDocument>('ThemeEngineTheme', ThemeSchema)
  );
}

export { ThemeSchema };
