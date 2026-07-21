'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, Puzzle } from 'lucide-react';
import { usePlugins } from '@/context/PluginContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { assetUrl } from '@/lib/apiClient';
import { DashboardPluginShell } from '@/components/dashboard/DashboardPluginShell';

/**
 * Runtime shell for uploaded system plugins.
 * Loads the package adminEntry (e.g. /plugins/<id>/admin/index.html) in an iframe.
 */
export default function UploadedSystemPluginRuntimePage() {
  const params = useParams<{ pluginId: string }>();
  const pluginId = decodeURIComponent(params.pluginId || '');
  const { activePlugins, isLoaded } = usePlugins();
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const plugin = useMemo(
    () => activePlugins.find((p) => p.pluginId === pluginId),
    [activePlugins, pluginId]
  );

  // Prefer absolute public URL; fall back if an older row stored a relative path.
  const adminSrc = useMemo(() => {
    const raw = (plugin?.adminEntry || '').trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (raw.startsWith('/plugins/')) {
      return assetUrl(raw);
    }
    return assetUrl(`/plugins/${encodeURIComponent(pluginId)}/${raw.replace(/^\/+/, '')}`);
  }, [plugin?.adminEntry, pluginId]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading plugin…
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Plugin unavailable
            </CardTitle>
            <CardDescription>
              This system plugin is not installed or is disabled. Enable it from the Plugins page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/plugins">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Plugins
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (plugin.kind !== 'system') {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Not a system plugin</CardTitle>
            <CardDescription>
              <strong>{plugin.name}</strong> is a block plugin. Add it from the page editor palette
              instead of opening a dashboard runtime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/plugins">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Plugins
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!adminSrc) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Missing admin entry</CardTitle>
            <CardDescription>
              This system plugin has no adminEntry. Re-upload a package with{' '}
              <code className="text-xs">admin/index.html</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <DashboardPluginShell>
      <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <Puzzle className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{plugin.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            System plugin · data API{' '}
            <code className="rounded bg-muted px-1">/api/plugins/{plugin.pluginId}/data</code>
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/plugins">Plugins</Link>
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 bg-muted/20">
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          title={`${plugin.name} admin`}
          src={adminSrc}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setIframeLoaded(true)}
        />
      </div>
      </div>
    </DashboardPluginShell>
  );
}
