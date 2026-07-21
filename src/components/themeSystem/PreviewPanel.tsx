'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { themeSystemApi } from './api';
import { ThemeSettingsForm } from './ThemeSettingsForm';
import { ThemeEditor } from './ThemeEditor';
import type { InstalledTheme } from './types';

interface Props {
  theme: InstalledTheme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate: (slug: string) => Promise<void> | void;
  onThemeChanged: (theme: InstalledTheme) => void;
}

export function PreviewPanel({ theme, open, onOpenChange, onActivate, onThemeChanged }: Props) {
  const [readme, setReadme] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!open || !theme) return;
    setReadme(null);
    setLoadingReadme(true);
    fetch(themeSystemApi.assetUrl(theme.slug, 'README.md'))
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => setReadme(t))
      .catch(() => setReadme(null))
      .finally(() => setLoadingReadme(false));
  }, [open, theme]);

  if (!theme) return null;

  const activate = async () => {
    setActivating(true);
    try {
      await onActivate(theme.slug);
    } finally {
      setActivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {theme.name}
            <span className="text-sm font-normal text-muted-foreground">v{theme.version}</span>
            {theme.active && <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>}
            {theme.status !== 'installed' && <Badge variant="destructive">{theme.status}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex max-h-[75vh] flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="code">Editor</TabsTrigger>
          </TabsList>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            <TabsContent value="details" className="space-y-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                {/* Screenshot served through the asset route */}
                <Image
                  src={themeSystemApi.assetUrl(theme.slug, theme.thumbnail)}
                  alt={`${theme.name} screenshot`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Meta label="Author" value={theme.author || '—'} />
                <Meta label="Version" value={theme.version} />
                <Meta label="License" value={theme.license || '—'} />
                <Meta label="Requires CMS" value={theme.minimumCMSVersion || 'any'} />
              </dl>

              {theme.description && <p className="text-sm text-muted-foreground">{theme.description}</p>}

              {theme.homepage && (
                <a
                  href={theme.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Homepage <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">README</h4>
                {loadingReadme ? (
                  <Skeleton className="h-24 w-full" />
                ) : readme ? (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">
                    {readme}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">No README included.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="options">
              <ThemeSettingsForm theme={theme} onSaved={onThemeChanged} />
            </TabsContent>

            <TabsContent value="code">
              <ThemeEditor theme={theme} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-2 flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!theme.active && (
            <Button onClick={activate} disabled={activating}>
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Activate
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
