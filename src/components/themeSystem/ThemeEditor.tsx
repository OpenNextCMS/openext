'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FileCode2, Save, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { themeSystemApi, ThemeApiError } from './api';
import type { InstalledTheme } from './types';

// Monaco is client-only and heavy → load lazily, no SSR (spec §13, §17 lazy-load).
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

function languageFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'css': return 'css';
    case 'scss': case 'less': return 'scss';
    case 'js': case 'mjs': case 'cjs': return 'javascript';
    case 'ts': return 'typescript';
    case 'tsx': case 'jsx': return 'typescript';
    case 'json': return 'json';
    case 'html': case 'htm': return 'html';
    case 'md': return 'markdown';
    case 'svg': case 'xml': return 'xml';
    default: return 'plaintext';
  }
}

export function ThemeEditor({ theme }: { theme: InstalledTheme }) {
  const [files, setFiles] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await themeSystemApi.listFiles(theme.slug);
      setFiles(list);
      if (list.length && !active) void openFile(list[0]);
    } catch (err) {
      toast.error(err instanceof ThemeApiError ? err.message : 'Failed to list files.');
    } finally {
      setLoadingList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.slug]);

  const openFile = useCallback(
    async (path: string) => {
      setLoadingFile(true);
      setActive(path);
      try {
        const { content: c } = await themeSystemApi.readFile(theme.slug, path);
        setContent(c);
        setSavedContent(c);
      } catch (err) {
        toast.error(err instanceof ThemeApiError ? err.message : 'Failed to open file.');
      } finally {
        setLoadingFile(false);
      }
    },
    [theme.slug]
  );

  const save = useCallback(async () => {
    if (!active) return;
    setSaving(true);
    try {
      await themeSystemApi.writeFile(theme.slug, active, content);
      setSavedContent(content);
      toast.success(`Saved ${active}`);
    } catch (err) {
      toast.error(err instanceof ThemeApiError ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [active, content, theme.slug]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Ctrl/Cmd+S to save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const dirty = content !== savedContent;

  return (
    <div className="flex h-[70vh] overflow-hidden rounded-lg border">
      {/* File tree */}
      <div className="flex w-56 flex-col border-r bg-muted/30">
        <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          <span>Files</span>
          <button onClick={() => void loadList()} className="rounded p-1 hover:bg-muted" aria-label="Refresh files">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          {loadingList ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <ul className="p-1">
              {files.map((f) => (
                <li key={f}>
                  <button
                    onClick={() => void openFile(f)}
                    className={cn(
                      'flex w-full items-center gap-1.5 truncate rounded px-2 py-1.5 text-left text-xs hover:bg-muted',
                      active === f && 'bg-primary/10 font-medium text-primary'
                    )}
                    title={f}
                  >
                    <FileCode2 className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                    <span className="truncate">{f}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="truncate font-mono text-xs text-muted-foreground">{active ?? 'No file selected'}</span>
          <Button size="sm" onClick={() => void save()} disabled={!active || !dirty || saving}>
            {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Save{dirty ? ' •' : ''}
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          {loadingFile && <Skeleton className="absolute inset-0 z-10 rounded-none" />}
          {active ? (
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              language={languageFor(active)}
              value={content}
              onChange={(v) => setContent(v ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                tabSize: 2,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a file to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
