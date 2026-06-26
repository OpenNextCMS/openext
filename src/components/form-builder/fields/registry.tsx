'use client';

import React from 'react';
import type { FormFieldTypeValue } from '@/types/form-builder';
import { type FieldRendererProps } from './types';
import { TextInputField, TextareaField, HiddenField } from './inputs';
import { DropdownField, RadioField, CheckboxField, RatingField } from './choices';
import {
  FileUploadField,
  SignatureField,
  SectionHeaderField,
  DividerField,
} from './special';

/** Map every field type to its renderer component. */
export const FIELD_RENDERERS: Record<FormFieldTypeValue, React.FC<FieldRendererProps>> = {
  text: TextInputField,
  textarea: TextareaField,
  email: TextInputField,
  phone: TextInputField,
  number: TextInputField,
  url: TextInputField,
  password: TextInputField,
  date: TextInputField,
  time: TextInputField,
  dropdown: DropdownField,
  radio: RadioField,
  checkbox: CheckboxField,
  rating: RatingField,
  file: FileUploadField,
  signature: SignatureField,
  hidden: HiddenField,
  section_header: SectionHeaderField,
  divider: DividerField,
};

const STRUCTURAL: FormFieldTypeValue[] = ['section_header', 'divider', 'hidden'];

/**
 * Labeled, accessible wrapper around a field renderer: label + required marker,
 * the control, help text and error message. Memoized — only re-renders when its
 * own value/error/disabled change (perf requirement).
 */
export const FieldControl = React.memo(function FieldControl(props: FieldRendererProps) {
  const { field, error } = props;
  const Renderer = FIELD_RENDERERS[field.type] ?? TextInputField;
  const inputId = `ff-${field.id}`;
  const isStructural = STRUCTURAL.includes(field.type);

  if (isStructural) {
    // Structural/hidden fields render bare (no label/error chrome).
    return <Renderer {...props} />;
  }

  const widthClass =
    field.width === '25%'
      ? 'w-full md:w-1/4'
      : field.width === '50%'
        ? 'w-full md:w-1/2'
        : field.width === '75%'
          ? 'w-full md:w-3/4'
          : 'w-full';

  return (
    <div className={`${widthClass} space-y-1.5 px-1`}>
      <label htmlFor={inputId} className="block text-sm font-medium" style={{ color: 'var(--color-text, inherit)' }}>
        {field.label}
        {field.required ? <span className="ml-0.5 text-red-500" aria-hidden="true">*</span> : null}
      </label>
      <Renderer {...props} />
      {field.helpText ? (
        <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
          {field.helpText}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
});
