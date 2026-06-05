'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { themeApi } from '@/components/theme-builder/api';
import { DEFAULT_THEME_CONFIG } from '@/lib/theme/cssVars.site';
import type { ThemeDTO } from '@/types/theme';

/**
 * Create a theme by duplicating an existing one (system theme template) or
 * starting from the default tokens. On create, opens the new theme in the editor.
 */
export default function NewThemePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ThemeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    themeApi
      .list()
      .then((list) => setTemplates(list))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const startBlank = async () => {
    setCreating(true);
    try {
      const created = await themeApi.create({
        name: 'New Theme',
        description: 'A custom theme.',
        theme: DEFAULT_THEME_CONFIG,
      });
      router.push(`/dashboard/themes/${created._id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(false);
    }
  };

  const fromTemplate = async (id: string) => {
    setCreating(true);
    try {
      const copy = await themeApi.duplicate(id);
      router.push(`/dashboard/themes/${copy._id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/themes/allthemes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create a theme</h1>
          <p className="text-sm text-muted-foreground">
            Start from a template or a blank theme. You can fully customize it next.
          </p>
        </div>
      </div>

      {creating ? (
        <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Creating…
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={startBlank}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed p-5 text-left hover:bg-muted/50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">Blank theme</span>
              <span className="block text-sm text-muted-foreground">
                Start from the default design tokens.
              </span>
            </span>
          </button>

          <div>
            <h2 className="mb-3 text-sm font-bold uppercase text-muted-foreground">
              Start from a template
            </h2>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => {
                  const swatches = [
                    t.theme?.colors?.primary,
                    t.theme?.colors?.secondary,
                    t.theme?.colors?.accent,
                    t.theme?.colors?.surface,
                  ].filter(Boolean) as string[];
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => fromTemplate(t._id)}
                      className="overflow-hidden rounded-xl border text-left transition-shadow hover:shadow-md"
                    >
                      <div className="flex h-20">
                        {swatches.map((c, i) => (
                          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="p-4">
                        <p className="font-semibold">{t.name}</p>
                        {t.description ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
