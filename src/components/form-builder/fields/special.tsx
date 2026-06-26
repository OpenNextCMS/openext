'use client';

import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Eraser } from 'lucide-react';
import { type FieldRendererProps, fieldIds, CONTROL_CLASS } from './types';

/** Special / structural renderers: file upload, signature, section header, divider. */

export function FileUploadField(props: FieldRendererProps) {
  const { field, onChange, disabled, error } = props;
  const { inputId, errId } = fieldIds(field);
  const [fileName, setFileName] = useState<string>('');

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName('');
      onChange(null);
      return;
    }
    setFileName(file.name);
    // Surface lightweight metadata; the binary is uploaded separately if needed.
    onChange({ name: file.name, size: file.size, type: file.type });
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center gap-2 rounded-[var(--radius,8px)] border border-dashed border-input px-3 py-3 text-sm hover:bg-accent"
      >
        <UploadCloud className="h-4 w-4" />
        <span>{fileName || field.placeholder || 'Choose a file'}</span>
      </label>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        disabled={disabled}
        required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        onChange={handle}
      />
    </div>
  );
}

/** Canvas-based signature capture; emits a PNG data URL on change. */
export function SignatureField(props: FieldRendererProps) {
  const { field, onChange, disabled, error } = props;
  const { inputId, errId } = fieldIds(field);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasInk) onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange('');
  };

  return (
    <div>
      <canvas
        id={inputId}
        ref={canvasRef}
        width={400}
        height={150}
        role="img"
        aria-label={`${field.label} signature pad${error ? ' (has error)' : ''}`}
        aria-describedby={error ? errId : undefined}
        className={CONTROL_CLASS + ' touch-none p-0'}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button
        type="button"
        onClick={clear}
        disabled={disabled}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Eraser className="h-3 w-3" /> Clear
      </button>
    </div>
  );
}

export function SectionHeaderField(props: FieldRendererProps) {
  const { field } = props;
  return (
    <div className="border-b pb-2">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text, inherit)' }}>
        {field.label}
      </h3>
      {field.helpText ? (
        <p className="text-sm text-muted-foreground">{field.helpText}</p>
      ) : null}
    </div>
  );
}

export function DividerField() {
  return <hr className="my-2 border-t" aria-hidden="true" />;
}
