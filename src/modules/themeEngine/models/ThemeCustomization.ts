import { Schema, type Connection, type Model, type Document, type Types } from 'mongoose';

/**
 * Per-theme customizer values (spec §55).
 * Separate from the immutable theme package and from global engine settings.
 */
export interface IThemeEngineCustomizationDocument extends Document {
  themeSlug: string;
  values: Record<string, unknown>;
  updatedAt: Date;
  updatedBy?: Types.ObjectId;
}

const ThemeCustomizationSchema = new Schema<IThemeEngineCustomizationDocument>(
  {
    // unique: true creates the index — do not also call schema.index() (duplicate warning).
    themeSlug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    values: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: 'theme_engine_customizations' }
);

export function getEngineThemeCustomizationModel(
  pageDb: Connection
): Model<IThemeEngineCustomizationDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.ThemeEngineCustomization as Model<IThemeEngineCustomizationDocument>) ||
    pageDb.model<IThemeEngineCustomizationDocument>('ThemeEngineCustomization', ThemeCustomizationSchema)
  );
}

export { ThemeCustomizationSchema };
