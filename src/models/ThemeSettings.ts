import { Schema, model, models } from 'mongoose';
import type { IBlogThemeSettingsDocument } from '@/types/index';

// Per-tenant blog design settings. A single document per tenant (page DB).
const ThemeSettingsSchema = new Schema<IBlogThemeSettingsDocument>(
  {
    typography: {
      headingFont: { type: String, default: 'Inter, system-ui, sans-serif' },
      bodyFont: { type: String, default: 'Inter, system-ui, sans-serif' },
      baseSize: { type: Number, default: 16 },
      lineHeight: { type: Number, default: 1.6 },
    },
    colors: {
      primary: { type: String, default: '#2563eb' },
      background: { type: String, default: '#ffffff' },
      text: { type: String, default: '#111827' },
      accent: { type: String, default: '#f59e0b' },
    },
    layout: {
      width: { type: String, enum: ['full', 'boxed'], default: 'boxed' },
      maxWidth: { type: Number, default: 1200 },
    },
    radius: { type: Number, default: 12 },
    cardStyle: { type: String, enum: ['flat', 'shadow', 'bordered'], default: 'shadow' },
    sidebarPosition: { type: String, enum: ['left', 'right', 'none'], default: 'right' },
    darkMode: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
  },
  { timestamps: true }
);

const ThemeSettingsModel =
  models.ThemeSettings || model<IBlogThemeSettingsDocument>('ThemeSettings', ThemeSettingsSchema);

export default ThemeSettingsModel;
export { ThemeSettingsSchema };
