import type { ThemeManifest, ThemeManifestSetting } from './types';

export interface FlatSettingField {
  key: string;
  label: string;
  type: string;
  default: unknown;
  group: string;
}

/** Flatten manifest.settings object schema or legacy themeSettings array into customizer fields. */
export function flattenSettingsSchema(manifest: ThemeManifest): FlatSettingField[] {
  const fromArray = (manifest.themeSettings ?? []).map((s) => ({
    key: s.key,
    label: s.label,
    type: s.type,
    default: s.default,
    group: 'general',
  }));

  const settingsObj = (manifest as ThemeManifest & { settings?: Record<string, unknown> }).settings;
  if (!settingsObj || typeof settingsObj !== 'object') return fromArray;

  const fromObject: FlatSettingField[] = [];
  for (const [group, fields] of Object.entries(settingsObj)) {
    if (fields === true || fields === false) continue;
    if (typeof fields !== 'object' || fields === null) continue;
    for (const [fieldKey, def] of Object.entries(fields as Record<string, unknown>)) {
      if (typeof def !== 'object' || def === null) continue;
      const d = def as { type?: string; default?: unknown; label?: string };
      fromObject.push({
        key: `${group}.${fieldKey}`,
        label: d.label ?? humanize(fieldKey),
        type: d.type ?? 'text',
        default: d.default,
        group,
      });
    }
  }

  return fromObject.length > 0 ? fromObject : fromArray;
}

/** Build default values map from schema. */
export function defaultsFromSettingsSchema(manifest: ThemeManifest): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of flattenSettingsSchema(manifest)) {
    out[field.key] = field.default;
  }
  for (const s of manifest.themeSettings ?? []) {
    if (!(s.key in out)) out[s.key] = s.default;
  }
  return out;
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[._-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function toThemeSettingDefinitions(manifest: ThemeManifest): ThemeManifestSetting[] {
  return flattenSettingsSchema(manifest).map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type as ThemeManifestSetting['type'],
    default: f.default,
  }));
}
