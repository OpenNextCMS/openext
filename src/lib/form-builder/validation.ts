import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import type { IFormField } from '@/types/form-builder';
import { NON_INPUT_FIELD_TYPES } from './constants';

/**
 * Runtime Zod schema construction from a form's field array. Used both by the
 * public submit route (server-side validation) and the FormRenderer (client).
 */

// E.164 phone format, e.g. +14155552671 (8–15 digits, optional leading +).
const E164 = /^\+?[1-9]\d{7,14}$/;

const PATTERN_PRESETS: Record<string, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: E164,
  url: /^https?:\/\/.+/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  letters: /^[a-zA-Z\s]+$/,
};

function applyStringRules(base: z.ZodString, field: IFormField): z.ZodString {
  let schema = base;
  const v = field.validation;
  if (v?.minLength != null) {
    schema = schema.min(v.minLength, `Must be at least ${v.minLength} characters`);
  }
  if (v?.maxLength != null) {
    schema = schema.max(v.maxLength, `Must be at most ${v.maxLength} characters`);
  }
  if (v?.regex) {
    try {
      schema = schema.regex(new RegExp(v.regex), 'Invalid format');
    } catch {
      /* ignore an invalid stored regex */
    }
  }
  if (v?.pattern && PATTERN_PRESETS[v.pattern]) {
    schema = schema.regex(PATTERN_PRESETS[v.pattern], 'Invalid format');
  }
  if (v?.custom) {
    try {
      schema = schema.regex(new RegExp(v.custom), 'Invalid value');
    } catch {
      /* custom may be a natural-language hint rather than a regex; ignore */
    }
  }
  return schema;
}

/** Build the Zod type for a single field (before required/optional wrapping). */
function fieldToZod(field: IFormField): ZodTypeAny {
  switch (field.type) {
    case 'email':
      return applyStringRules(z.string().email('Enter a valid email address'), field);
    case 'url':
      return applyStringRules(z.string().url('Enter a valid URL'), field);
    case 'phone':
      return applyStringRules(z.string().regex(E164, 'Enter a valid phone number'), field);
    case 'number':
    case 'rating':
      return z.coerce.number({ invalid_type_error: 'Enter a number' });
    case 'checkbox':
      // Checkbox groups submit an array of selected values.
      return z.array(z.string()).default([]);
    case 'date':
    case 'time':
      return applyStringRules(z.string(), field);
    case 'file':
      // File metadata (name/url) is validated separately; accept a string ref.
      return z.string();
    case 'hidden':
      return z.string();
    case 'text':
    case 'textarea':
    case 'password':
    case 'dropdown':
    case 'radio':
    case 'signature':
    default:
      return applyStringRules(z.string(), field);
  }
}

/** Wrap a base schema to honor the field's `required` flag. */
function applyRequired(base: ZodTypeAny, field: IFormField): ZodTypeAny {
  if (field.required) {
    // For strings, also reject empty values.
    if (base instanceof z.ZodString) {
      return base.min(1, `${field.label || 'This field'} is required`);
    }
    return base;
  }
  // Optional fields accept empty string / undefined.
  if (base instanceof z.ZodString) {
    return z.union([base, z.literal('')]).optional();
  }
  return base.optional();
}

export function buildZodSchema(fields: IFormField[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    if (NON_INPUT_FIELD_TYPES.includes(field.type)) continue;
    shape[field.id] = applyRequired(fieldToZod(field), field);
  }
  return z.object(shape);
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  data?: Record<string, unknown>;
}

/** Validate raw submission data against a built schema, returning typed errors. */
export function validateSubmission(
  schema: z.ZodObject<Record<string, ZodTypeAny>>,
  data: Record<string, unknown>
): ValidationResult {
  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: {}, data: result.data as Record<string, unknown> };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
