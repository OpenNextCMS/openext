'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ExtensionDetail {
  extensionId: string;
  name: string;
  description: string;
  version: string;
  targetPluginId: string;
  publisher?: { name: string; url?: string } | null;
  status: string;
  health: string;
  checksum: string;
  sdkCompatibility: string;
  dependencies: Array<{ id: string; version: string }>;
  requestedPermissions: string[];
  approvedPermissions: string[];
  trustedExecution: string;
  installedAt?: string | null;
  enabledAt?: string | null;
  updatedAt?: string | null;
  lastError?: string | null;
  previousVersion?: string | null;
  migrationStatus: string;
  migrationError?: string | null;
  capabilities: string[];
  history: Array<{ at: string; action: string; message?: string; version?: string }>;
}

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message || `Request failed (${response.status})`;
}

export function ExtensionDetailView({ extensionId }: { extensionId: string }) {
  const [extension, setExtension] = useState<ExtensionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const [deleteHistory, setDeleteHistory] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/dashboard/extensions/${extensionId}`);
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { extension: ExtensionDetail };
      setExtension(payload.extension);
      setSelectedPermissions(payload.extension.approvedPermissions || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load extension');
    } finally {
      setLoading(false);
    }
  }, [extensionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(path: string, init: RequestInit, success: string) {
    setBusy(path);
    try {
      const response = await apiFetch(path, init);
      const payload = (await response.json()) as { message?: string; extension?: ExtensionDetail };
      if (!response.ok) throw new Error(payload.message || 'Request failed');
      toast.success(payload.message || success);
      if (payload.extension) setExtension(payload.extension);
      else await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy('');
    }
  }

  if (loading || !extension) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading extension
      </div>
    );
  }

  const canEnable = extension.status === 'installed' || extension.status === 'disabled' || extension.status === 'failed';
  const canDisable = extension.status === 'enabled';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/extensions" className="text-sm text-muted-foreground hover:underline">
            Back to extensions
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{extension.name}</h1>
          <p className="text-sm text-muted-foreground">{extension.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{extension.status}</Badge>
          <Badge variant="outline">{extension.health}</Badge>
        </div>
      </div>

      {extension.lastError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Last error</CardTitle>
            <CardDescription>{extension.lastError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Package</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Extension ID" value={extension.extensionId} />
            <Row label="Version" value={extension.version} />
            <Row label="Target plugin" value={extension.targetPluginId} />
            <Row label="Publisher" value={extension.publisher?.name || 'Unknown'} />
            <Row label="SDK range" value={extension.sdkCompatibility} />
            <Row label="Checksum" value={extension.checksum.slice(0, 16)} />
            <Row label="Installed" value={extension.installedAt || '—'} />
            <Row label="Enabled" value={extension.enabledAt || '—'} />
            <Row label="Updated" value={extension.updatedAt || '—'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capabilities and dependencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Capabilities" value={extension.capabilities.join(', ') || 'None'} />
            <Row
              label="Dependencies"
              value={extension.dependencies.map((item) => `${item.id} ${item.version}`).join(', ') || 'None'}
            />
            <Row label="Migrations" value={extension.migrationStatus} />
            {extension.migrationError ? <p className="text-destructive">{extension.migrationError}</p> : null}
            <Row label="Previous version" value={extension.previousVersion || 'None'} />
            <Row label="Trusted execution" value={extension.trustedExecution} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions</CardTitle>
          <CardDescription>
            Approving a permission does not enable the extension. Backend code still stays unloaded until you approve trusted execution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {extension.requestedPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">This extension does not request permissions.</p>
          ) : (
            extension.requestedPermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission)}
                  onChange={(event) => {
                    setSelectedPermissions((current) =>
                      event.target.checked
                        ? [...current, permission]
                        : current.filter((item) => item !== permission)
                    );
                  }}
                />
                {permission}
              </label>
            ))
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy !== ''}
              onClick={() =>
                void act(
                  `/api/dashboard/extensions/${extension.extensionId}/permissions`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ approve: selectedPermissions }),
                  },
                  'Permissions saved'
                )
              }
            >
              Save approved permissions
            </Button>
            <Button
              variant="outline"
              disabled={busy !== ''}
              onClick={() =>
                void act(
                  `/api/dashboard/extensions/${extension.extensionId}/permissions`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ approve: selectedPermissions, trustedExecution: 'approved' }),
                  },
                  'Trusted execution approved'
                )
              }
            >
              Approve trust
            </Button>
            <Button
              variant="outline"
              disabled={busy !== ''}
              onClick={() =>
                void act(
                  `/api/dashboard/extensions/${extension.extensionId}/permissions`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ approve: selectedPermissions, trustedExecution: 'denied' }),
                  },
                  'Trusted execution denied'
                )
              }
            >
              Deny trust
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canEnable || busy !== ''}
              onClick={() => void act(`/api/dashboard/extensions/${extension.extensionId}/enable`, { method: 'POST' }, 'Enabled')}
            >
              {busy.endsWith('/enable') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enable
            </Button>
            <Button
              variant="outline"
              disabled={!canDisable || busy !== ''}
              onClick={() => void act(`/api/dashboard/extensions/${extension.extensionId}/disable`, { method: 'POST' }, 'Disabled')}
            >
              Disable
            </Button>
            <Button
              variant="outline"
              disabled={!extension.previousVersion || busy !== ''}
              onClick={() =>
                void act(`/api/dashboard/extensions/${extension.extensionId}/rollback`, { method: 'POST' }, 'Rolled back')
              }
            >
              Roll back
            </Button>
            <Button variant="destructive" disabled={busy !== ''} onClick={() => setConfirmUninstall(true)}>
              Uninstall
            </Button>
          </div>
          <label className="text-sm">
            Update ZIP
            <input
              type="file"
              accept=".zip,application/zip"
              className="mt-1 block w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.set('file', file);
                void act(
                  `/api/dashboard/extensions/${extension.extensionId}/update`,
                  { method: 'POST', body },
                  'Updated'
                );
              }}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {extension.history.length === 0 ? <p className="text-muted-foreground">No history yet.</p> : null}
          {[...extension.history].reverse().map((entry, index) => (
            <div key={`${entry.at}-${index}`} className="rounded-md border p-3">
              <div className="font-medium">
                {entry.action} {entry.version ? `· ${entry.version}` : ''}
              </div>
              <div className="text-muted-foreground">{entry.message}</div>
              <div className="text-xs text-muted-foreground">{entry.at}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={confirmUninstall} onOpenChange={setConfirmUninstall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uninstall {extension.name}?</DialogTitle>
            <DialogDescription>
              This removes the extension package from disk and unregisters it. User tables created by a trusted migration are not dropped.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={deleteHistory}
              onChange={(event) => setDeleteHistory(event.target.checked)}
            />
            Also clear extension migration history. This still does not drop user data.
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUninstall(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmUninstall(false);
                void act(
                  `/api/dashboard/extensions/${extension.extensionId}/uninstall`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirmDeleteData: deleteHistory }),
                  },
                  'Uninstalled'
                ).then(() => {
                  window.location.href = '/dashboard/extensions';
                });
              }}
            >
              Uninstall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-medium sm:text-right">{value}</span>
    </div>
  );
}
