import type { IFormField } from '@/types/form-builder';

/** Common props every field renderer accepts. */
export interface FieldRendererProps {
  field: IFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  /** Whether the field is currently visible per the conditional-logic engine. */
  visible?: boolean;
}

/** Shared id/aria helpers so every renderer is accessible and consistent. */
export function fieldIds(field: IFormField) {
  const inputId = `ff-${field.id}`;
  const helpId = field.helpText ? `${inputId}-help` : undefined;
  const errId = `${inputId}-error`;
  return { inputId, helpId, errId };
}

/** Base control classes pulling color/radius from the CMS theme CSS vars. */
export const CONTROL_CLASS =
  'w-full rounded-[var(--radius,8px)] border border-input bg-background px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#2563eb)] disabled:opacity-50';
