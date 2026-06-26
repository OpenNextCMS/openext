'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contrastRatio } from '@/lib/theme/cssVars';
import { AlertTriangle } from 'lucide-react';

/** A labelled color swatch + hex input row (mirrors the blog DesignControls). */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Only feed the native picker a hex value (it rejects rgb()/var()).
  const pickerValue = /^#([0-9a-fA-F]{6})$/.test(value) ? value : '#000000';
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="capitalize">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border"
          aria-label={`${label} color picker`}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-32" />
      </div>
    </div>
  );
}

/** A labelled text/size input row. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/** A section wrapper used by every tab. */
export function ControlSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border p-4">
      {title ? (
        <h2 className="text-sm font-bold uppercase text-muted-foreground">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

/** Inline WCAG contrast warning between two colors. */
export function ContrastWarning({
  fg,
  bg,
  min = 4.5,
  message,
}: {
  fg: string;
  bg: string;
  min?: number;
  message: string;
}) {
  const ratio = contrastRatio(fg, bg);
  if (ratio === null || ratio >= min) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-orange-600">
      <AlertTriangle className="h-3 w-3" /> {message} ({ratio.toFixed(1)}:1)
    </p>
  );
}
