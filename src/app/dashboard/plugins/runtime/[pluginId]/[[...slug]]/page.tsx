'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, Puzzle } from 'lucide-react';
import { usePlugins } from '@/context/PluginContext';
import { useRbac } from '@/hooks/useRbac';
import { useExtensionHostPages } from '@/hooks/useExtensionHostPages';
import { usePluginMount } from '@/hooks/usePluginMount';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { assetUrl } from '@/lib/apiClient';
import { DashboardPluginShell } from '@/components/dashboard/DashboardPluginShell';
import { resolveAdminMountModule, runtimePluginPath } from '@/lib/plugins/adminNav';
import {
  EXTENSION_RUNTIME_SEGMENT,
  isMountModuleEntry,
} from '@/lib/extensions/hostPages';
import {
  resolveExtensionMountModuleUrl,
  resolvePluginMountModuleUrl,
} from '@/lib/plugins/mountRuntime';

/**
 * Runtime shell for uploaded system plugins.
 * Loads the package adminMount (or an extension mount module) into a CMS-owned div.
 * No iframe — plugins must export mount/unmount.
 */
export default function UploadedSystemPluginRuntimePage() {
  const params = useParams<{ pluginId: string; slug?: string[] }>();
  const pluginId = decodeURIComponent(params.pluginId || '');
  const slug = (params.slug ?? []).map((part) => decodeURIComponent(part));
  const extensionRoute = slug[0] === EXTENSION_RUNTIME_SEGMENT;
  const extensionId = extensionRoute ? slug[1] : undefined;
  const extensionPageId = extensionRoute ? slug[2] : undefined;
  const navId = extensionRoute ? undefined : slug[0];
  const router = useRouter();
  const { activePlugins, isLoaded } = usePlugins();
  const { pages: extensionPages, loaded: extensionPagesLoaded } = useExtensionHostPages();
  const { canUsePlugin, canAccessPluginPage, getPluginPageFeatures, access, loading: rbacLoading } =
    useRbac();

  const plugin = useMemo(
    () => activePlugins.find((p) => p.pluginId === pluginId),
    [activePlugins, pluginId]
  );

  const pageFeatures = useMemo(
    () => getPluginPageFeatures(pluginId, navId),
    [getPluginPageFeatures, pluginId, navId]
  );

  const featuresKey = pageFeatures === '*' ? '*' : pageFeatures.join(',');

  const extensionPage = useMemo(() => {
    if (!extensionId || !extensionPageId) return undefined;
    return extensionPages.find(
      (page) =>
        page.extensionId === extensionId &&
        page.id === extensionPageId &&
        page.targetPluginId === pluginId
    );
  }, [extensionId, extensionPageId, extensionPages, pluginId]);

  const pageLabel = useMemo(() => {
    if (extensionPage) return extensionPage.label;
    if (!navId || !plugin?.adminNav?.length) return null;
    return plugin.adminNav.find((item) => item.id === navId)?.label ?? null;
  }, [extensionPage, navId, plugin?.adminNav]);

  const mountEntry = useMemo(() => {
    if (extensionPage) return extensionPage.entry;
    return resolveAdminMountModule(plugin?.adminMount, plugin?.adminNav, navId);
  }, [extensionPage, plugin?.adminMount, plugin?.adminNav, navId]);

  const moduleUrl = useMemo(() => {
    if (!mountEntry) return '';
    if (extensionPage) {
      if (!isMountModuleEntry(mountEntry)) return '';
      return resolveExtensionMountModuleUrl(extensionPage.extensionId, mountEntry);
    }
    return resolvePluginMountModuleUrl(pluginId, mountEntry);
  }, [mountEntry, extensionPage, pluginId]);

  const styleUrls = useMemo(() => {
    if (!plugin?.styles?.length) return [];
    return plugin.styles.map((href) => {
      if (href.startsWith('http://') || href.startsWith('https://')) return href;
      if (href.startsWith('/')) return assetUrl(href);
      return assetUrl(`/plugins/${encodeURIComponent(pluginId)}/${href.replace(/^\/+/, '')}`);
    });
  }, [plugin?.styles, pluginId]);

  const activePageId = extensionRoute ? extensionPageId : navId;

  const { containerRef, status: mountStatus, error: mountError } = usePluginMount({
    moduleUrl: extensionRoute && extensionPage && !isMountModuleEntry(extensionPage.entry) ? '' : moduleUrl,
    pluginId,
    pageId: activePageId,
    roleId: access?.pluginUserType?.id,
    features: pageFeatures,
    extensionId: extensionPage?.extensionId,
    styleUrls,
  });

  // Bare /runtime/{pluginId} → first allowed adminNav page so sidebar + mount pageId stay in sync.
  useEffect(() => {
    if (!isLoaded || rbacLoading || !plugin) return;
    if (extensionRoute || navId) return;
    if (!plugin.adminNav?.length) return;
    const firstAllowed =
      plugin.adminNav.find((item) => canAccessPluginPage(pluginId, item.id)) ?? plugin.adminNav[0];
    if (firstAllowed?.id) {
      router.replace(runtimePluginPath(pluginId, firstAllowed.id));
    }
  }, [
    isLoaded,
    rbacLoading,
    plugin,
    extensionRoute,
    navId,
    pluginId,
    canAccessPluginPage,
    router,
  ]);

  if (!isLoaded || rbacLoading || (extensionRoute && !extensionPagesLoaded)) {
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

  if (!canUsePlugin(pluginId)) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Access denied
            </CardTitle>
            <CardDescription>
              Your role cannot use the <strong>{plugin.name}</strong> plugin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
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

  if (extensionRoute && !extensionPage) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Extension page unavailable</CardTitle>
            <CardDescription>
              This page is not installed or is disabled. <strong>{plugin.name}</strong> is unchanged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/dashboard/plugins/runtime/${encodeURIComponent(pluginId)}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Open plugin
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    extensionRoute &&
    extensionPage &&
    !isMountModuleEntry(extensionPage.entry)
  ) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Extension must use a mount module</CardTitle>
            <CardDescription>
              Page <code className="text-xs">{extensionPage.entry}</code> is not a JS mount entry.
              Ship <code className="text-xs">ui/pages/*.js</code> exporting <code className="text-xs">mount</code>{' '}
              (HTML-only extension pages are not opened in an iframe).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/dashboard/plugins/runtime/${encodeURIComponent(pluginId)}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Open plugin
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!extensionRoute && navId && plugin.adminNav?.length && !plugin.adminNav.some((item) => item.id === navId)) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Page not found</CardTitle>
            <CardDescription>
              <strong>{plugin.name}</strong> does not define an admin page with id{' '}
              <code className="text-xs">{navId}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/dashboard/plugins/runtime/${encodeURIComponent(pluginId)}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Open default page
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!extensionRoute && navId && !canAccessPluginPage(pluginId, navId)) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Page not allowed
            </CardTitle>
            <CardDescription>
              Your role cannot open the <strong>{pageLabel || navId}</strong> page of{' '}
              <strong>{plugin.name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!mountEntry || !moduleUrl) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Missing adminMount</CardTitle>
            <CardDescription>
              This system plugin has no <code className="text-xs">adminMount</code>. Re-upload a
              package that exports <code className="text-xs">mount</code> from{' '}
              <code className="text-xs">ui/admin/mount.js</code> (HTML iframe display is no longer
              used).
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
            <p className="truncate text-sm font-semibold">
              {plugin.name}
              {pageLabel ? ` · ${pageLabel}` : ''}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {extensionPage ? (
                <>Extension mount · {extensionPage.extensionId}</>
              ) : (
                <>
                  System plugin · mount API ·{' '}
                  <code className="rounded bg-muted px-1">/api/plugins/{plugin.pluginId}/data</code>
                </>
              )}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/plugins">Plugins</Link>
          </Button>
        </div>

        <div className="relative min-h-[50vh] flex-1 bg-muted/20">
          {mountStatus === 'loading' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {mountStatus === 'error' && mountError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
              <Card className="max-w-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Mount failed
                  </CardTitle>
                  <CardDescription>{mountError}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}
          <div
            key={`${pluginId}:${activePageId || 'default'}`}
            ref={containerRef}
            id="plugin-root"
            className="absolute inset-0 overflow-auto bg-white p-4"
            data-plugin-id={pluginId}
            data-page-id={activePageId || ''}
            data-features={featuresKey}
          />
        </div>
      </div>
    </DashboardPluginShell>
  );
}
