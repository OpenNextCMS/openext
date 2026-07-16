import { Schema, type Connection, type Model, type Document } from 'mongoose';

/**
 * Mongoose model for an installed theme (spec §3).
 *
 * Design notes:
 *  - Bound to a passed `Connection` (this CMS is multi-tenant; themes live in the
 *    per-tenant page DB), matching the project's existing model-getter pattern.
 *  - The "only one active theme" invariant (§3, §6) is enforced in TWO layers:
 *      1. Service layer runs a deactivate→activate transaction (ActivationService).
 *      2. A PARTIAL UNIQUE INDEX below makes MongoDB itself reject a second
 *         `active: true` document — defense in depth against races/bugs.
 *  - `settings` is `Mixed` so the theme's manifest `settings` block (which drives
 *    the auto-generated Theme Options page) needs no schema migration.
 */

export type ThemeStatus = 'installed' | 'corrupted' | 'updating';

export interface IInstalledTheme {
  name: string;
  slug: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  license?: string;
  /** Public URL/path of the screenshot used on the theme card. */
  thumbnail: string;
  /** Install path relative to project root, e.g. `themes/modern-theme`. */
  path: string;
  status: ThemeStatus;
  installed: boolean;
  active: boolean;
  /** Manifest `settings` block → drives the auto Theme Options page. */
  settings: Record<string, unknown>;
  /** Minimum CMS version the theme declared (kept for audit/compat display). */
  minimumCMSVersion?: string;
  /** Freeform manifest extras preserved for round-trip/export. */
  meta?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInstalledThemeDocument
  extends Omit<IInstalledTheme, 'createdAt' | 'updatedAt'>,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

const InstalledThemeSchema = new Schema<IInstalledThemeDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    version: { type: String, required: true, trim: true },
    author: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    homepage: { type: String, default: '' },
    license: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    path: { type: String, required: true },
    status: {
      type: String,
      enum: ['installed', 'corrupted', 'updating'],
      default: 'installed',
      index: true,
    },
    installed: { type: Boolean, default: true },
    active: { type: Boolean, default: false },
    settings: { type: Schema.Types.Mixed, default: {} },
    minimumCMSVersion: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'installed_themes' }
);

// One theme per slug.
InstalledThemeSchema.index({ slug: 1 }, { unique: true });

// DB-enforced single-active invariant: the value `true` may exist at most once.
// (Inactive docs store active:false and are excluded by the partial filter.)
InstalledThemeSchema.index(
  { active: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

/**
 * Get the connection-bound model, reusing an existing registration if present
 * (Next.js hot-reload / multiple tenant connections safe).
 */
export function getInstalledThemeModel(connection: Connection): Model<IInstalledThemeDocument> {
  return (
    (connection.models.InstalledTheme as Model<IInstalledThemeDocument>) ||
    connection.model<IInstalledThemeDocument>('InstalledTheme', InstalledThemeSchema)
  );
}

export { InstalledThemeSchema };
