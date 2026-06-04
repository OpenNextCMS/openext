'use client';

import React from 'react';
import { type FieldRendererProps, fieldIds, CONTROL_CLASS } from './types';

/**
 * Text-like field renderers: text, email, phone, number, url, password,
 * textarea, date, time, hidden. Each is theme-aware (CSS vars), fully wired for
 * ARIA, and controlled via value/onChange.
 */

function htmlType(t: string): string {
  switch (t) {
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'number':
      return 'number';
    case 'url':
      return 'url';
    case 'password':
      return 'password';
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    default:
      return 'text';
  }
}

function commonAria(props: FieldRendererProps) {
  const { inputId, helpId, errId } = fieldIds(props.field);
  const describedBy = [helpId, props.error ? errId : null].filter(Boolean).join(' ');
  return {
    id: inputId,
    'aria-invalid': !!props.error,
    'aria-required': !!props.field.required,
    'aria-describedby': describedBy || undefined,
  };
}

export function TextInputField(props: FieldRendererProps) {
  const { field, value, onChange, onBlur, disabled } = props;
  return (
    <input
      {...commonAria(props)}
      type={htmlType(field.type)}
      className={CONTROL_CLASS + (field.cssClass ? ` ${field.cssClass}` : '')}
      placeholder={field.placeholder}
      value={value == null ? '' : String(value)}
      disabled={disabled}
      required={field.required}
      onChange={(e) => onChange(field.type === 'number' ? e.target.value : e.target.value)}
      onBlur={onBlur}
    />
  );
}

export function TextareaField(props: FieldRendererProps) {
  const { field, value, onChange, onBlur, disabled } = props;
  return (
    <textarea
      {...commonAria(props)}
      className={CONTROL_CLASS + ' min-h-[96px]' + (field.cssClass ? ` ${field.cssClass}` : '')}
      placeholder={field.placeholder}
      value={value == null ? '' : String(value)}
      disabled={disabled}
      required={field.required}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

/** Hidden field: rendered but visually/ARIA-hidden; still carries a value. */
export function HiddenField(props: FieldRendererProps) {
  const { field, value } = props;
  const { inputId } = fieldIds(field);
  return (
    <input
      id={inputId}
      type="hidden"
      name={field.id}
      value={value == null ? String(field.defaultValue ?? '') : String(value)}
      readOnly
    />
  );
}
