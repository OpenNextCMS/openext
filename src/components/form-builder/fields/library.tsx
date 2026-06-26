import React from 'react';
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Link as LinkIcon,
  Lock,
  ChevronDownSquare,
  CircleDot,
  CheckSquare,
  Calendar,
  Clock,
  Upload,
  Star,
  EyeOff,
  Heading,
  Minus,
  PenLine,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { IFormField, FormFieldTypeValue } from '@/types/form-builder';

export type FieldCategory = 'Basic' | 'Advanced' | 'Layout';

export interface FieldLibraryItem {
  type: FormFieldTypeValue;
  label: string;
  category: FieldCategory;
  icon: React.ReactNode;
}

const ic = 'h-4 w-4';

/** Palette metadata for the FieldLibrary, grouped by category. */
export const FIELD_LIBRARY: FieldLibraryItem[] = [
  { type: 'text', label: 'Text', category: 'Basic', icon: <Type className={ic} /> },
  { type: 'textarea', label: 'Text Area', category: 'Basic', icon: <AlignLeft className={ic} /> },
  { type: 'email', label: 'Email', category: 'Basic', icon: <Mail className={ic} /> },
  { type: 'phone', label: 'Phone', category: 'Basic', icon: <Phone className={ic} /> },
  { type: 'number', label: 'Number', category: 'Basic', icon: <Hash className={ic} /> },
  { type: 'url', label: 'URL', category: 'Basic', icon: <LinkIcon className={ic} /> },
  { type: 'dropdown', label: 'Dropdown', category: 'Basic', icon: <ChevronDownSquare className={ic} /> },
  { type: 'radio', label: 'Radio', category: 'Basic', icon: <CircleDot className={ic} /> },
  { type: 'checkbox', label: 'Checkbox', category: 'Basic', icon: <CheckSquare className={ic} /> },
  { type: 'date', label: 'Date', category: 'Advanced', icon: <Calendar className={ic} /> },
  { type: 'time', label: 'Time', category: 'Advanced', icon: <Clock className={ic} /> },
  { type: 'password', label: 'Password', category: 'Advanced', icon: <Lock className={ic} /> },
  { type: 'file', label: 'File Upload', category: 'Advanced', icon: <Upload className={ic} /> },
  { type: 'rating', label: 'Rating', category: 'Advanced', icon: <Star className={ic} /> },
  { type: 'signature', label: 'Signature', category: 'Advanced', icon: <PenLine className={ic} /> },
  { type: 'hidden', label: 'Hidden', category: 'Advanced', icon: <EyeOff className={ic} /> },
  { type: 'section_header', label: 'Section Header', category: 'Layout', icon: <Heading className={ic} /> },
  { type: 'divider', label: 'Divider', category: 'Layout', icon: <Minus className={ic} /> },
];

export const FIELD_CATEGORIES: FieldCategory[] = ['Basic', 'Advanced', 'Layout'];

const NEEDS_OPTIONS: FormFieldTypeValue[] = ['dropdown', 'radio', 'checkbox'];

/** Build a fresh field of the given type with sensible defaults. */
export function createField(type: FormFieldTypeValue, order = 0): IFormField {
  const meta = FIELD_LIBRARY.find((f) => f.type === type);
  const base: IFormField = {
    id: uuidv4(),
    type,
    label: meta?.label ?? 'Field',
    required: false,
    width: '100%',
    order,
    validation: {},
    step: 1,
  };
  if (NEEDS_OPTIONS.includes(type)) {
    base.options = [
      { label: 'Option 1', value: 'option-1' },
      { label: 'Option 2', value: 'option-2' },
    ];
  }
  if (type === 'section_header') base.label = 'Section title';
  return base;
}

export function fieldTypeLabel(type: FormFieldTypeValue): string {
  return FIELD_LIBRARY.find((f) => f.type === type)?.label ?? type;
}
