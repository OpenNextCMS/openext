import type { ThemeSectionFieldSchema, ThemeSectionFieldType } from './types';

/**
 * Normalize a theme block schema module export into a typed field list.
 * Accepts `{ fields: [...] }`, a bare array, or `{ default: { fields } }`.
 */
export function normalizeSectionSchema(raw: unknown): ThemeSectionFieldSchema[] {
  if (!raw) return [];
  let value: unknown = raw;
  if (typeof value === 'object' && value !== null && 'default' in (value as object)) {
    value = (value as { default: unknown }).default;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeField).filter(Boolean) as ThemeSectionFieldSchema[];
  }
  if (typeof value === 'object' && value !== null && Array.isArray((value as { fields?: unknown }).fields)) {
    return ((value as { fields: unknown[] }).fields)
      .map(normalizeField)
      .filter(Boolean) as ThemeSectionFieldSchema[];
  }
  return [];
}

function normalizeField(raw: unknown): ThemeSectionFieldSchema | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const key = String(obj.key || '').trim();
  const label = String(obj.label || key).trim();
  const type = String(obj.type || 'text') as ThemeSectionFieldType;
  if (!key) return null;
  const allowed: ThemeSectionFieldType[] = [
    'text',
    'textarea',
    'color',
    'image',
    'number',
    'boolean',
    'url',
    'select',
    'list',
  ];
  if (!allowed.includes(type)) return null;

  const field: ThemeSectionFieldSchema = {
    key,
    label: label || key,
    type,
  };
  if (obj.default !== undefined) field.default = obj.default;
  if (Array.isArray(obj.options)) field.options = obj.options.map(String);
  if (Array.isArray(obj.itemFields)) {
    field.itemFields = obj.itemFields
      .map(normalizeField)
      .filter(Boolean) as ThemeSectionFieldSchema[];
  }
  return field;
}

/** Build a defaults object from schema field defaults. */
export function defaultsFromSchema(fields: ThemeSectionFieldSchema[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.default !== undefined) {
      out[field.key] = field.default;
    } else if (field.type === 'list') {
      out[field.key] = [];
    } else if (field.type === 'boolean') {
      out[field.key] = false;
    } else if (field.type === 'number') {
      out[field.key] = 0;
    } else {
      out[field.key] = '';
    }
  }
  return out;
}

/**
 * Validate section data against a schema. Returns sanitized data + field errors.
 * Unknown keys are stripped. Invalid types are coerced or rejected.
 */
export function validateSectionData(
  fields: ThemeSectionFieldSchema[],
  raw: Record<string, unknown>
): { data: Record<string, unknown>; errors: Record<string, string> } {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = raw[field.key];
    const result = coerceField(field, value);
    if (result.error) {
      errors[field.key] = result.error;
      data[field.key] = field.default !== undefined ? field.default : result.fallback;
    } else {
      data[field.key] = result.value;
    }
  }

  return { data, errors };
}

function coerceField(
  field: ThemeSectionFieldSchema,
  value: unknown
): { value?: unknown; fallback?: unknown; error?: string } {
  switch (field.type) {
    case 'boolean':
      if (typeof value === 'boolean') return { value };
      if (value === 'true' || value === 1) return { value: true };
      if (value === 'false' || value === 0) return { value: false };
      return { fallback: Boolean(field.default), error: 'must be a boolean' };
    case 'number': {
      if (typeof value === 'number' && Number.isFinite(value)) return { value };
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        return { value: Number(value) };
      }
      return { fallback: typeof field.default === 'number' ? field.default : 0, error: 'must be a number' };
    }
    case 'select': {
      const options = field.options || [];
      const str = value == null ? '' : String(value);
      if (options.length && !options.includes(str)) {
        return {
          fallback: typeof field.default === 'string' ? field.default : options[0] || '',
          error: `must be one of: ${options.join(', ')}`,
        };
      }
      return { value: str };
    }
    case 'list': {
      if (!Array.isArray(value)) {
        return { fallback: Array.isArray(field.default) ? field.default : [], error: 'must be a list' };
      }
      const itemFields = field.itemFields || [];
      const items = value.map((item) => {
        const obj = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        return validateSectionData(itemFields, obj).data;
      });
      return { value: items };
    }
    case 'color':
    case 'image':
    case 'url':
    case 'text':
    case 'textarea':
    default:
      if (value == null) return { value: '' };
      return { value: String(value) };
  }
}

/** CMS content JSON shape for a theme-declared editable section. */
export interface ThemeSectionContent {
  sectionId: string;
  themeSlug: string;
  hidden?: boolean;
  data: Record<string, unknown>;
}

export function parseThemeSectionContent(content: unknown): ThemeSectionContent | null {
  try {
    const raw =
      typeof content === 'string'
        ? (JSON.parse(content || '{}') as Record<string, unknown>)
        : content && typeof content === 'object'
          ? (content as Record<string, unknown>)
          : null;
    if (!raw) return null;
    const sectionId = String(raw.sectionId || '').trim();
    if (!sectionId) return null;
    const data =
      raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : Object.fromEntries(
            Object.entries(raw).filter(
              ([k]) => !['sectionId', 'themeSlug', 'hidden', 'data'].includes(k)
            )
          );
    return {
      sectionId,
      themeSlug: String(raw.themeSlug || ''),
      hidden: Boolean(raw.hidden),
      data,
    };
  } catch {
    return null;
  }
}

export function serializeThemeSectionContent(section: ThemeSectionContent): string {
  return JSON.stringify({
    sectionId: section.sectionId,
    themeSlug: section.themeSlug,
    hidden: Boolean(section.hidden),
    data: section.data || {},
  });
}
