'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { type FieldRendererProps, fieldIds, CONTROL_CLASS } from './types';

/** Choice + rating renderers: dropdown, radio, checkbox (group), rating. */

export function DropdownField(props: FieldRendererProps) {
  const { field, value, onChange, onBlur, disabled, error } = props;
  const { inputId, helpId, errId } = fieldIds(field);
  return (
    <select
      id={inputId}
      className={CONTROL_CLASS + (field.cssClass ? ` ${field.cssClass}` : '')}
      value={value == null ? '' : String(value)}
      disabled={disabled}
      required={field.required}
      aria-invalid={!!error}
      aria-required={!!field.required}
      aria-describedby={[helpId, error ? errId : null].filter(Boolean).join(' ') || undefined}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    >
      <option value="">{field.placeholder || 'Select…'}</option>
      {(field.options ?? []).map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function RadioField(props: FieldRendererProps) {
  const { field, value, onChange, disabled, error } = props;
  const { inputId, errId } = fieldIds(field);
  return (
    <div role="radiogroup" aria-labelledby={inputId} aria-invalid={!!error} className="space-y-2">
      {(field.options ?? []).map((opt) => {
        const id = `${inputId}-${opt.value}`;
        return (
          <label key={opt.value} htmlFor={id} className="flex items-center gap-2 text-sm">
            <input
              id={id}
              type="radio"
              name={field.id}
              value={opt.value}
              checked={String(value) === opt.value}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              aria-describedby={error ? errId : undefined}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function CheckboxField(props: FieldRendererProps) {
  const { field, value, onChange, disabled } = props;
  const { inputId } = fieldIds(field);
  const selected: string[] = Array.isArray(value) ? (value as string[]) : [];

  // A checkbox with options is a multi-select group; without options it's a
  // single boolean consent-style checkbox.
  if (!field.options || field.options.length === 0) {
    return (
      <label htmlFor={inputId} className="flex items-center gap-2 text-sm">
        <input
          id={inputId}
          type="checkbox"
          checked={value === true || value === 'true'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.placeholder || field.label}</span>
      </label>
    );
  }

  const toggle = (val: string, checked: boolean) => {
    const next = checked ? [...selected, val] : selected.filter((v) => v !== val);
    onChange(next);
  };

  return (
    <div role="group" aria-labelledby={inputId} className="space-y-2">
      {field.options.map((opt) => {
        const id = `${inputId}-${opt.value}`;
        return (
          <label key={opt.value} htmlFor={id} className="flex items-center gap-2 text-sm">
            <input
              id={id}
              type="checkbox"
              value={opt.value}
              checked={selected.includes(opt.value)}
              disabled={disabled}
              onChange={(e) => toggle(opt.value, e.target.checked)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

const RATING_MAX = 5;

export function RatingField(props: FieldRendererProps) {
  const { field, value, onChange, disabled, error } = props;
  const { inputId, errId } = fieldIds(field);
  const current = Number(value) || 0;
  return (
    <div
      id={inputId}
      role="radiogroup"
      aria-label={field.label}
      aria-invalid={!!error}
      aria-describedby={error ? errId : undefined}
      className="flex items-center gap-1"
    >
      {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={current === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className="p-0.5 disabled:opacity-50"
        >
          <Star
            className="h-6 w-6"
            fill={n <= current ? 'var(--color-accent, #f59e0b)' : 'none'}
            stroke={n <= current ? 'var(--color-accent, #f59e0b)' : 'currentColor'}
          />
        </button>
      ))}
    </div>
  );
}
