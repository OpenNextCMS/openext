'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

/** A selectable option card with a header label, optional preview, and selected state. */
export function SelectableCard({
  selected,
  onSelect,
  title,
  description,
  children,
  className = '',
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/40'
      } ${className}`}
    >
      {selected && (
        <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-4 w-4" />
        </span>
      )}
      {children}
      <div>
        <div className="font-semibold text-foreground">{title}</div>
        {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
      </div>
    </button>
  );
}
