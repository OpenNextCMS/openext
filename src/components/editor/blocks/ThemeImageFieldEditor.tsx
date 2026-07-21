'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Link2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/apiClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type ImageSourceMode = 'url' | 'upload';

interface ThemeImageFieldEditorProps {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  compact?: boolean;
}

function resolvePreviewSrc(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return trimmed;
}

export default function ThemeImageFieldEditor({
  label,
  value,
  onChange,
  compact = false,
}: ThemeImageFieldEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImageSourceMode>(
    value.trim().startsWith('/upload/') ? 'upload' : 'url'
  );
  const [uploading, setUploading] = useState(false);
  const previewSrc = resolvePreviewSrc(value);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(apiUrl('/api/editor/background-upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = (await response.json()) as { success?: boolean; filePath?: string; message?: string };
      if (!response.ok || !data.filePath) {
        throw new Error(data.message || 'Upload failed');
      }

      onChange(data.filePath);
      setMode('upload');
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${compact ? '' : 'rounded border border-white/10 p-2'}`}>
      {label ? <span className="text-[11px] text-neutral-400">{label}</span> : null}

      <div className="flex gap-1">
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] ${
            mode === 'url' ? 'bg-sky-600 text-white' : 'bg-white/5 text-neutral-300 hover:bg-white/10'
          }`}
          onClick={() => setMode('url')}
        >
          <Link2 className="h-3 w-3" />
          URL
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] ${
            mode === 'upload' ? 'bg-sky-600 text-white' : 'bg-white/5 text-neutral-300 hover:bg-white/10'
          }`}
          onClick={() => setMode('upload')}
        >
          <Upload className="h-3 w-3" />
          Upload
        </button>
      </div>

      {mode === 'url' ? (
        <Input
          type="url"
          placeholder="https://example.com/image.jpg"
          className="h-8 border-white/10 bg-neutral-950 text-xs text-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 w-full text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Choose image from device
              </>
            )}
          </Button>
          {value.startsWith('/upload/') ? (
            <p className="truncate text-[10px] text-neutral-500" title={value}>
              {value}
            </p>
          ) : (
            <p className="text-[10px] text-neutral-500">
              JPG, PNG, WebP, or GIF — max recommended 5 MB
            </p>
          )}
        </div>
      )}

      {previewSrc ? (
        <div className="overflow-hidden rounded border border-white/10 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Preview"
            className="h-24 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center rounded border border-dashed border-white/10 text-[10px] text-neutral-500">
          <ImageIcon className="mr-1 h-3.5 w-3.5" />
          No image selected
        </div>
      )}

      {value ? (
        <button
          type="button"
          className="text-[10px] text-red-300 hover:text-red-200"
          onClick={() => onChange('')}
        >
          Clear image
        </button>
      ) : null}
    </div>
  );
}
