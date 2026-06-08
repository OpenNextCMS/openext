'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Check, Lock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { loadTheme, setName, setDraft, markSaved } from '@/redux/themeBuilderSlice';
import { mergeThemeConfig, DEFAULT_THEME_CONFIG } from '@/lib/theme/cssVars.site';
import { themeApi } from './api';
import { ColorsTab } from './ColorsTab';
import { TypographyTab } from './TypographyTab';
import { SpacingTab } from './SpacingTab';
import { RadiusTab } from './RadiusTab';
import { ShadowsTab } from './ShadowsTab';
import { LayoutTab } from './LayoutTab';
import { VariantsTab } from './VariantsTab';
import { ThemePreview } from '@/components/theme-preview/ThemePreview';

const TABS = [
  { value: 'colors', label: 'Colors', Comp: ColorsTab },
  { value: 'typography', label: 'Typography', Comp: TypographyTab },
  { value: 'spacing', label: 'Spacing', Comp: SpacingTab },
  { value: 'radius', label: 'Radius', Comp: RadiusTab },
  { value: 'shadows', label: 'Shadows', Comp: ShadowsTab },
  { value: 'layout', label: 'Layout', Comp: LayoutTab },
  { value: 'variants', label: 'Variants', Comp: VariantsTab },
];

/**
 * Theme editor: loads a theme into the Redux draft, renders the tabbed controls
 * and the live preview side-by-side, and saves via PUT. System themes are
 * read-only here — the page offers "Duplicate to edit" instead.
 */
export function ThemeBuilder({ themeId }: { themeId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [meta, setMeta] = useState<{ isSystemTheme: boolean; isActive: boolean }>({
    isSystemTheme: false,
    isActive: false,
  });

  const name = useAppSelector((s) => s.themeBuilder.name);
  const draft = useAppSelector((s) => s.themeBuilder.draft);
  const componentVariants = useAppSelector((s) => s.themeBuilder.componentVariants);
  const dirty = useAppSelector((s) => s.themeBuilder.dirty);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    themeApi
      .get(themeId)
      .then((t) => {
        if (cancelled) return;
        dispatch(
          loadTheme({
            themeId: t._id,
            name: t.name,
            draft: mergeThemeConfig(t.theme),
            componentVariants: t.componentVariants || {},
            isSystemTheme: t.isSystemTheme,
          })
        );
        setMeta({ isSystemTheme: t.isSystemTheme, isActive: t.isActive });
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [themeId, dispatch]);

  const save = async () => {
    setSaving(true);
    try {
      await themeApi.update(themeId, { name, theme: draft, componentVariants });
      dispatch(markSaved());
      toast.success('Theme saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    try {
      const copy = await themeApi.duplicate(themeId);
      toast.success('Duplicated — opening the editable copy');
      router.push(`/dashboard/themes/${copy._id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const activate = async () => {
    setActivating(true);
    try {
      await themeApi.activate(themeId);
      setMeta((m) => ({ ...m, isActive: true }));
      toast.success('Theme activated');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActivating(false);
    }
  };

  const resetToDefaults = () => {
    if (!confirm('Reset all tokens to the default design values? Save to keep the change.')) return;
    dispatch(setDraft(mergeThemeConfig(DEFAULT_THEME_CONFIG)));
    toast.message('Tokens reset to defaults — Save to apply');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const readOnly = meta.isSystemTheme;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/themes/allthemes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => dispatch(setName(e.target.value))}
            disabled={readOnly}
            className="w-64 font-semibold"
            aria-label="Theme name"
          />
          {meta.isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <Check className="h-3 w-3" /> Active
            </span>
          ) : null}
          {readOnly ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Lock className="h-3 w-3" /> System theme
            </span>
          ) : null}
          {!readOnly && dirty ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              ● Unsaved changes
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!meta.isActive ? (
            <Button variant="outline" onClick={activate} disabled={activating}>
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Activate
            </Button>
          ) : null}
          {readOnly ? (
            <Button onClick={duplicate}>Duplicate to edit</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={resetToDefaults} disabled={saving}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
              <Button onClick={save} disabled={saving || !dirty}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Controls + live preview */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className={readOnly ? 'pointer-events-none opacity-60' : ''}>
          <Tabs defaultValue="colors">
            <TabsList className="flex flex-wrap h-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map(({ value, Comp }) => (
              <TabsContent key={value} value={value}>
                <Comp />
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <ThemePreview />
      </div>
    </div>
  );
}

export default ThemeBuilder;
