'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Puzzle,
  RefreshCw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ExtensionSummary {
  extensionId: string;
  name: string;
  description: string;
  version: string;
  targetPluginId: string;
  publisher?: { name: string } | null;
  status: string;
  health: string;
  trustedExecution: string;
  updatedAt?: string | null;
  installedAt?: string | null;
  lastError?: string | null;
}

interface ValidationPayload {
  status: string;
  installable: boolean;
  enableable: boolean;
  errors: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
  checksum: string;
  manifest: {
    id: string;
    name: string;
    version: string;
    target: { pluginId: string; version: string };
    permissions: string[];
    capabilities: string[];
    dependencies: Array<{ id: string; version: string }>;
  } | null;
  security: {
    zipValid: boolean;
    pathSafety: boolean;
    entryPoints: boolean;
    executableContent: boolean;
  };
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'enabled') return 'default';
  if (status === 'failed' || status === 'error') return 'destructive';
  if (status === 'installed') return 'secondary';
  return 'outline';
}

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message || `Request failed (${response.status})`;
}

export function ExtensionsManager() {
  const [extensions, setExtensions] = useState<ExtensionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [validation, setValidation] = useState<ValidationPayload | null>(null);
  const [stagingId, setStagingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/dashboard/extensions');
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { extensions: ExtensionSummary[] };
      setExtensions(payload.extensions || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load extensions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setValidation(null);
    setStagingId(null);
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await apiFetch('/api/dashboard/extensions', { method: 'POST', body });
      const payload = (await response.json()) as {
        message?: string;
        stagingId?: string | null;
        validation?: ValidationPayload;
      };
      if (!payload.validation) throw new Error(payload.message || 'Upload failed');
      setValidation(payload.validation);
      setStagingId(payload.stagingId ?? null);
      if (!response.ok && !payload.validation) throw new Error(payload.message || 'Upload failed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function install() {
    if (!stagingId) return;
    setInstalling(true);
    try {
      const response = await apiFetch('/api/dashboard/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagingId }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Install failed');
      toast.success(payload.message || 'Extension installed');
      setValidation(null);
      setStagingId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Install failed');
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Extensions</h1>
          <p className="text-sm text-muted-foreground">
            Install packages that extend a plugin which has registered the extension SDK. Complete plugins stay on the Plugins page.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Upload extension
          </CardTitle>
          <CardDescription>
            The package is validated before anything is enabled. Privileged permissions stay blocked until you approve them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center hover:bg-muted/40">
            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => void onUpload(event.target.files?.[0] ?? null)}
            />
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            <span className="mt-2 text-sm">Choose a .zip extension package</span>
          </label>
          {uploading ? <Progress value={65} /> : null}
          {validation ? (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={validation.installable ? 'secondary' : 'destructive'}>{validation.status}</Badge>
                {validation.manifest ? (
                  <span className="text-sm">
                    {validation.manifest.name} {validation.manifest.version} → {validation.manifest.target.pluginId}
                  </span>
                ) : null}
              </div>
              <ul className="space-y-1 text-sm">
                <SecurityRow ok={validation.security.zipValid} label="ZIP archive" />
                <SecurityRow ok={validation.security.pathSafety} label="Path safety" />
                <SecurityRow ok={validation.security.entryPoints} label="Entry points" />
                <SecurityRow ok={validation.security.executableContent} label="File types" />
              </ul>
              {validation.manifest ? (
                <p className="text-sm text-muted-foreground">
                  Capabilities: {validation.manifest.capabilities.join(', ') || 'none'}. Permissions:{' '}
                  {validation.manifest.permissions.join(', ') || 'none'}. Dependencies:{' '}
                  {validation.manifest.dependencies.map((item) => item.id).join(', ') || 'none'}.
                </p>
              ) : null}
              {validation.errors.map((error) => (
                <p key={`${error.code}-${error.message}`} className="text-sm text-destructive">
                  {error.message}
                </p>
              ))}
              {validation.warnings.map((warning) => (
                <p key={`${warning.code}-${warning.message}`} className="text-sm text-amber-600 dark:text-amber-400">
                  {warning.message}
                </p>
              ))}
              <Button onClick={() => void install()} disabled={!validation.installable || !stagingId || installing}>
                {installing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Install package
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading extensions
            </CardContent>
          </Card>
        ) : null}
        {!loading && extensions.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No extensions are installed. Upload a package whose manifest type is plugin-extension.
            </CardContent>
          </Card>
        ) : null}
        {extensions.map((extension) => (
          <Card key={extension.extensionId}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4" />
                  {extension.name}
                </span>
                <Badge variant={statusVariant(extension.status)}>{extension.status}</Badge>
              </CardTitle>
              <CardDescription>{extension.description || extension.extensionId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Meta label="ID" value={extension.extensionId} />
                <Meta label="Version" value={extension.version} />
                <Meta label="Target" value={extension.targetPluginId} />
                <Meta label="Publisher" value={extension.publisher?.name || 'Unknown'} />
                <Meta label="Health" value={extension.health} />
                <Meta label="Trust" value={extension.trustedExecution} />
              </div>
              {extension.lastError ? <p className="text-destructive">{extension.lastError}</p> : null}
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/extensions/${extension.extensionId}`}>View details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

function SecurityRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
      <span>{label}</span>
      {!ok ? <ShieldAlert className="h-4 w-4 text-destructive" /> : null}
    </li>
  );
}
