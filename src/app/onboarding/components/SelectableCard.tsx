'use client';

import { Check } from 'lucide-react';
import type { ReactNode, KeyboardEvent } from 'react';

/**
 * A selectable option card with a header label, optional preview, and selected
 * state.
 *
 * Implemented as a `div[role=button]` rather than a native `<button>` on
 * purpose: some cards embed live block previews (header/footer) that contain
 * their own `<a>`/`<button>` elements, and nesting interactive elements inside a
 * native button is invalid HTML — the browser would auto-close the button and
 * drop the preview. A role=button div with keyboard handling keeps it
 * accessible without that constraint.
 */
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
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
      className={`group relative flex w-full cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
    </div>
  );
}
