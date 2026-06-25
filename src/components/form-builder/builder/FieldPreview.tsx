'use client';

import React from 'react';
import { Star } from 'lucide-react';
import type { IFormField } from '@/types/form-builder';

/**
 * Non-interactive visual preview of a field for the builder canvas. Renders
 * faux controls (divs/spans) — NEVER real input elements — so nothing in the
 * builder can be focused/submitted. Memoized for performance.
 */

const fauxControl = 'mt-1 rounded-[var(--radius,8px)] border border-input bg-muted/40';

function Preview({ field }: { field: IFormField }) {
  switch (field.type) {
    case 'section_header':
      return (
        <div className="border-b pb-1">
          <div className="text-lg font-semibold">{field.label}</div>
          {field.helpText ? <div className="text-xs text-muted-foreground">{field.helpText}</div> : null}
        </div>
      );
    case 'divider':
      return <hr className="my-1 border-t" />;
    case 'textarea':
      return <div className={`${fauxControl} h-20`} />;
    case 'checkbox':
    case 'radio':
      return (
        <div className="mt-1 space-y-1">
          {(field.options ?? [{ label: 'Option', value: 'o' }]).map((o, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={`inline-block h-3.5 w-3.5 border border-input ${
                  field.type === 'radio' ? 'rounded-full' : 'rounded'
                }`}
              />
              {o.label}
            </div>
          ))}
        </div>
      );
    case 'rating':
      return (
        <div className="mt-1 flex gap-1 text-muted-foreground">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-5 w-5" />
          ))}
        </div>
      );
    case 'dropdown':
      return <div className={`${fauxControl} flex h-9 items-center px-3 text-sm text-muted-foreground`}>{field.placeholder || 'Select…'}</div>;
    case 'file':
      return <div className={`${fauxControl} flex h-10 items-center px-3 text-sm text-muted-foreground`}>{field.placeholder || 'Choose a file'}</div>;
    case 'signature':
      return <div className={`${fauxControl} h-24`} />;
    case 'hidden':
      return <div className="mt-1 text-xs italic text-muted-foreground">Hidden field (not visible to users)</div>;
    default:
      return (
        <div className={`${fauxControl} flex h-9 items-center px-3 text-sm text-muted-foreground`}>
          {field.placeholder || ''}
        </div>
      );
  }
}

export const FieldPreview = React.memo(function FieldPreview({ field }: { field: IFormField }) {
  const structural = field.type === 'section_header' || field.type === 'divider';
  return (
    <div>
      {!structural ? (
        <label className="block text-sm font-medium">
          {field.label}
          {field.required ? <span className="ml-0.5 text-red-500">*</span> : null}
          {field.width && field.width !== '100%' ? (
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{field.width}</span>
          ) : null}
        </label>
      ) : null}
      <Preview field={field} />
    </div>
  );
});
