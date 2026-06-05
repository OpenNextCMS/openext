'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Pencil, Copy, Trash2, Check, Palette, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { themeApi } from '@/components/theme-builder/api';
import type { ThemeDTO, ThemeConfig } from '@/types/theme';

/**
 * A compact, live mini-mockup of a theme — a faux navbar (header), hero heading,
 * supporting line, and a primary button — all driven by the theme's own tokens.
 * Gives each card a real "header" preview instead of a bare color strip.
 */
function ThemeCardPreview({ theme }: { theme?: ThemeConfig }) {
  const c = theme?.colors;
  const t = theme?.typography;
  const r = theme?.radius;
  return (
    <div
      className="flex h-32 flex-col overflow-hidden text-[7px] leading-tight"
      style={{ backgroundColor: c?.background ?? '#ffffff', fontFamily: t?.bodyFont }}
    >
      {/* Faux navbar / header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: c?.surface ?? '#f8fafc', color: c?.text ?? '#111827' }}
      >
        <span className="font-bold" style={{ fontFamily: t?.headingFont }}>
          Brand
        </span>
        <div className="flex gap-2" style={{ color: c?.muted ?? '#6b7280' }}>
          <span>Home</span>
          <span>Features</span>
          <span>Pricing</span>
        </div>
      </div>
      {/* Faux hero */}
      <div className="flex flex-1 flex-col items-start justify-center gap-1.5 px-3">
        <div
          className="text-[12px] font-bold leading-none"
          style={{ color: c?.text ?? '#111827', fontFamily: t?.headingFont }}
        >
          Build something great
        </div>
        <div style={{ color: c?.muted ?? '#6b7280' }}>
          A short supporting line that adapts to the theme.
        </div>
        <div className="mt-1 flex gap-1.5">
          <span
            className="px-2 py-1 font-semibold"
            style={{
              backgroundColor: c?.primary ?? '#2563eb',
              color: c?.background ?? '#ffffff',
              borderRadius: r?.md ?? '8px',
            }}
          >
            Get started
          </span>
          <span
            className="px-2 py-1 font-semibold"
            style={{
              backgroundColor: c?.accent ?? '#f59e0b',
              color: c?.background ?? '#ffffff',
              borderRadius: r?.md ?? '8px',
            }}
          >
            Learn more
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AllThemesPage() {
  const [themes, setThemes] = useState<ThemeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setThemes(await themeApi.list());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async (id: string) => {
    setBusyId(id);
    try {
      await themeApi.activate(id);
      toast.success('Theme activated');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (id: string) => {
    setBusyId(id);
    try {
      await themeApi.duplicate(id);
      toast.success('Theme duplicated');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this theme? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await themeApi.remove(id);
      toast.success('Theme deleted');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Palette className="h-6 w-6" /> Themes
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize your site appearance. The active theme drives your public pages.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/themes/new" prefetch>
            <Plus className="mr-2 h-4 w-4" /> Create Theme
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : themes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No themes yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => {
            const busy = busyId === t._id;
            return (
              <div key={t._id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
                {/* Live themed mini-mockup (header + hero) */}
                <ThemeCardPreview theme={t.theme} />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    {t.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : null}
                    {t.isSystemTheme ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" /> System
                      </span>
                    ) : null}
                  </div>
                  {t.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  ) : null}
                  <p className="mt-auto text-xs text-muted-foreground">
                    {t.updatedAt ? `Updated ${new Date(t.updatedAt).toLocaleDateString()}` : null}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {!t.isActive ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => activate(t._id)}>
                        Activate
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/dashboard/themes/${t._id}`} prefetch>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> {t.isSystemTheme ? 'View' : 'Edit'}
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => duplicate(t._id)}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
                    </Button>
                    {!t.isSystemTheme && !t.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={busy}
                        onClick={() => remove(t._id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
