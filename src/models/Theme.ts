import { Schema, model, models } from 'mongoose';
import type { IThemeDocument } from '@/types/theme';

/**
 * Site-wide Theme model. Lives in the per-tenant *page* DB (tenancy = separate
 * DB), so a theme's slug only needs to be unique within this collection. A
 * nullable `tenantId` (the page-DB name) is stored for traceability only.
 *
 * The nested token groups are kept as Mixed for forward-compat: future token
 * additions and the reserved `meta` bag (export/import, versioning, AI, etc.)
 * never require a schema migration. Validation happens at the API layer via Zod
 * (`src/lib/theme/theme-validator.ts`).
 */

const ThemeConfigSchema = new Schema(
  {
    colors: { type: Schema.Types.Mixed, default: {} },
    typography: { type: Schema.Types.Mixed, default: {} },
    spacing: { type: Schema.Types.Mixed, default: {} },
    radius: { type: Schema.Types.Mixed, default: {} },
    shadows: { type: Schema.Types.Mixed, default: {} },
    layout: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ThemeSchema = new Schema<IThemeDocument>(
  {
    tenantId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    isSystemTheme: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false, index: true },
    version: { type: String, default: '1.0.0' },
    previewImage: { type: String, default: '' },
    createdBy: { type: String },
    theme: { type: ThemeConfigSchema, default: () => ({}) },
    componentVariants: { type: Schema.Types.Mixed, default: {} },
    // Reserved forward-compat bag (export/import, versioning, AI, marketplace).
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Slug is unique per tenant database (tenancy = separate DB).
ThemeSchema.index({ slug: 1 }, { unique: true });

const ThemeModel = models.Theme || model<IThemeDocument>('Theme', ThemeSchema);

export default ThemeModel;
export { ThemeSchema };
