'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Palette, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ThemeCard } from './ThemeCard';
import { UploadModal } from './UploadModal';
import { PreviewPanel } from './PreviewPanel';
import { themeSystemApi, ThemeApiError } from './api';
import type { InstalledTheme, SortKey, StatusFilter } from './types';
import { compareVersionsDesc } from './sort';

const PAGE_SIZE = 8;

export function ThemeManager() {
  const [themes, setThemes] = useState<InstalledTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [updateSlug, setUpdateSlug] = useState<string | null>(null);
  const [preview, setPreview] = useState<InstalledTheme | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await themeSystemApi.list();
      setThemes(list);
    } catch (err) {
      toast.error(err instanceof ThemeApiError ? err.message : 'Failed to load themes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activate = useCallback(
    async (slug: string) => {
      try {
        await themeSystemApi.activate(slug);
        toast.success('Theme activated. Existing content is unchanged.');
        await refresh();
        setPreviewOpen(false);
      } catch (err) {
        toast.error(err instanceof ThemeApiError ? err.message : 'Activation failed.');
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (slug: string) => {
      try {
        await themeSystemApi.remove(slug);
        toast.success('Theme deleted.');
        await refresh();
      } catch (err) {
        toast.error(err instanceof ThemeApiError ? err.message : 'Delete failed.');
      }
    },
    [refresh]
  );

  const openDetails = useCallback((theme: InstalledTheme) => {
    setPreview(theme);
    setPreviewOpen(true);
  }, []);

  const openUpdate = useCallback((theme: InstalledTheme) => {
    setUpdateSlug(theme.slug);
    setUploadOpen(true);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = themes.filter((t) => {
      if (status === 'active' && !t.active) return false;
      if (status === 'installed' && t.status !== 'installed') return false;
      if (status === 'corrupted' && t.status !== 'corrupted') return false;
      if (q && !(`${t.name} ${t.author} ${t.description} ${t.slug}`.toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'version') return compareVersionsDesc(a.version, b.version);
      // recent
      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    });
    return list;
  }, [themes, search, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, status, sort]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Palette className="h-6 w-6" /> Themes
          </h1>
          <p className="text-sm text-muted-foreground">Upload, preview, activate and edit themes. Switching a theme changes only presentation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => void refresh()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              setUpdateSlug(null);
              setUploadOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Upload Theme
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search themes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="installed">Installed</SelectItem>
            <SelectItem value="corrupted">Corrupted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="version">Version</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-0">
              <Skeleton className="aspect-video w-full rounded-t-lg" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <Palette className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {themes.length === 0 ? 'No themes installed yet.' : 'No themes match your filters.'}
          </p>
          {themes.length === 0 && (
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Upload your first theme
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((theme) => (
            <ThemeCard
              key={theme._id}
              theme={theme}
              onActivate={activate}
              onDelete={remove}
              onDetails={openDetails}
              onUpdate={openUpdate}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i}
              variant={safePage === i + 1 ? 'default' : 'outline'}
              size="sm"
              className="w-9"
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        updateSlug={updateSlug}
        onInstalled={() => void refresh()}
      />
      <PreviewPanel
        theme={preview}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onActivate={activate}
        onThemeChanged={(t) => {
          setPreview(t);
          setThemes((list) => list.map((x) => (x.slug === t.slug ? t : x)));
        }}
      />
    </div>
  );
}
