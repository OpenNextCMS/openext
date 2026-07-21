'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileArchive, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { themeSystemApi, ThemeApiError } from './api';
import type { InstalledTheme } from './types';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, uploads as an UPDATE for this slug instead of a fresh install. */
  updateSlug?: string | null;
  onInstalled: (theme: InstalledTheme) => void;
}

const MAX_MB = 100;

export function UploadModal({ open, onOpenChange, updateSlug, onInstalled }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPhase('idle');
    setPercent(0);
    setStage('');
  }, []);

  const pickFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) {
      toast.error('Please choose a .zip theme package.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Theme exceeds the ${MAX_MB} MB limit.`);
      return;
    }
    setFile(f);
    setPhase('idle');
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      pickFile(e.dataTransfer.files?.[0] ?? null);
    },
    [pickFile]
  );

  const start = useCallback(async () => {
    if (!file) return;
    setPhase('uploading');
    setPercent(0);
    setStage('Uploading…');
    try {
      const onProgress = (pct: number) => {
        setPercent(pct);
        if (pct >= 100) {
          setPhase('processing');
          setStage('Extracting → Validating → Installing…');
        }
      };
      const theme = updateSlug
        ? await themeSystemApi.update(updateSlug, file, onProgress)
        : await themeSystemApi.upload(file, onProgress);

      setPhase('done');
      setStage('Completed');
      toast.success(updateSlug ? `Updated “${theme.name}” to v${theme.version}.` : `Installed “${theme.name}”.`);
      onInstalled(theme);
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 700);
    } catch (err) {
      setPhase('error');
      const msg = err instanceof ThemeApiError ? err.message : 'Upload failed.';
      setStage(msg);
      toast.error(msg);
    }
  }, [file, updateSlug, onInstalled, onOpenChange, reset]);

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return; // don't close mid-upload
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{updateSlug ? 'Update theme' : 'Upload theme'}</DialogTitle>
          <DialogDescription>
            {updateSlug
              ? 'Upload a newer version — the current version is backed up and restored automatically if anything fails.'
              : 'Drag & drop a theme .zip, or browse. Max 100 MB.'}
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <UploadCloud className="h-9 w-9 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium text-primary">Click to browse</span> or drop a .zip here
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileArchive className="h-6 w-6 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
              {!busy && phase !== 'done' && (
                <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {(busy || phase === 'done' || phase === 'error') && (
              <div className="space-y-2">
                <Progress value={phase === 'done' ? 100 : percent} />
                <div className="flex items-center gap-2 text-xs">
                  {phase === 'done' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : null}
                  <span className={cn(phase === 'error' ? 'text-destructive' : 'text-muted-foreground')}>{stage}</span>
                  {phase === 'uploading' && <span className="ml-auto tabular-nums text-muted-foreground">{percent}%</span>}
                </div>
              </div>
            )}

            {!busy && phase !== 'done' && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>
                  Choose another
                </Button>
                <Button onClick={start}>{updateSlug ? 'Update' : 'Install'}</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
