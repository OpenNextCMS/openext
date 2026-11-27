'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Cloud, HardDrive, Loader2 } from 'lucide-react';
import { apiUrl } from '@/lib/apiClient';
import { usePlugins } from '@/context/PluginContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const PLUGIN_ID = 's3-media-plugin';
const API_BASE = `/api/plugins/${PLUGIN_ID}`;

type S3Settings = {
  bucket: string;
  accessPointArn?: string;
  endpoint?: string;
  region: string;
  prefix: string;
  publicUrlBase: string;
  hasCredentials?: boolean;
  isConfigured?: boolean;
  usesAccessPoint?: boolean;
  accessKeyIdPreview?: string;
};

type MediaStorageStatus = {
  storage: 's3' | 'local';
  pluginActive: boolean;
  configured: boolean;
  message: string;
};

export default function S3StorageConfig() {
  const { activePlugins, isLoaded } = usePlugins();
  const pluginActive = activePlugins.some((p) => p.pluginId === PLUGIN_ID);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [storageStatus, setStorageStatus] = useState<MediaStorageStatus | null>(null);

  const [bucket, setBucket] = useState('');
  const [accessPointArn, setAccessPointArn] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [prefix, setPrefix] = useState('nextcms-media');
  const [publicUrlBase, setPublicUrlBase] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [accessKeyHint, setAccessKeyHint] = useState('');

  const refreshStorageStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/dashboard/settings/media-storage'), {
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setStorageStatus({
          storage: data.storage === 's3' ? 's3' : 'local',
          pluginActive: Boolean(data.pluginActive),
          configured: Boolean(data.configured),
          message: String(data.message || ''),
        });
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !pluginActive) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`${API_BASE}/settings`), { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load S3 settings');

        const settings: S3Settings = data.settings || {};
        setBucket(settings.bucket || '');
        setAccessPointArn(settings.accessPointArn || '');
        setEndpoint(settings.endpoint || '');
        setRegion(settings.region || 'us-east-1');
        setPrefix(settings.prefix || 'nextcms-media');
        setPublicUrlBase(settings.publicUrlBase || '');
        setAccessKeyHint(
          settings.accessKeyIdPreview
            ? `Saved key: ${settings.accessKeyIdPreview} (enter a new value to replace)`
            : 'Enter your AWS access key ID'
        );
        await refreshStorageStatus();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load S3 settings');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, pluginActive, refreshStorageStatus]);

  if (!isLoaded) {
    return null;
  }

  if (!pluginActive) {
    return (
      <Alert className="m-5">
        <Cloud className="h-4 w-4" />
        <AlertTitle>S3 Media Storage</AlertTitle>
        <AlertDescription>
          Upload and enable the <strong>S3 Media Storage</strong> plugin to configure AWS cloud
          image storage here. Until then, CMS media is stored on the local server.
        </AlertDescription>
      </Alert>
    );
  }

  const buildPayload = () => {
    const payload: Record<string, string> = {
      bucket: bucket.trim(),
      accessPointArn: accessPointArn.trim(),
      endpoint: endpoint.trim(),
      region: region.trim(),
      prefix: prefix.trim(),
      publicUrlBase: publicUrlBase.trim(),
    };
    if (accessKeyId.trim()) payload.accessKeyId = accessKeyId.trim();
    if (secretAccessKey.trim()) payload.secretAccessKey = secretAccessKey.trim();
    return payload;
  };

  const handleTest = async () => {
    setTesting(true);
    setConnectionMessage('');
    try {
      const res = await fetch(apiUrl(`${API_BASE}/settings/test`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), useSaved: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Connection test failed');
      setConnectionMessage(data.connection?.ok ? data.connection.message : data.connection?.message);
      if (data.connection?.ok) toast.success(data.connection.message);
      else toast.error(data.connection?.message || 'Connection failed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setConnectionMessage('');
    try {
      const res = await fetch(apiUrl(`${API_BASE}/settings`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save S3 settings');

      setAccessKeyId('');
      setSecretAccessKey('');
      if (data.settings?.accessKeyIdPreview) {
        setAccessKeyHint(
          `Saved key: ${data.settings.accessKeyIdPreview} (enter a new value to replace)`
        );
      }
      setConnectionMessage(data.connection?.message || data.message || 'Saved');
      toast.success(data.message || 'S3 settings saved');
      await refreshStorageStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save S3 settings');
    } finally {
      setSaving(false);
    }
  };

  const usingS3 = storageStatus?.storage === 's3';

  return (
    <div className="m-5 space-y-4 rounded-lg border border-border p-5">
      <div className="flex items-center gap-2">
        <Cloud className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-base font-semibold">AWS S3 Media Storage</h3>
          <p className="text-sm text-muted-foreground">
            When configured, all CMS image uploads (editor, blog, site icon, profile) are stored
            in your S3 bucket or Access Point only — not on the local server disk.
          </p>
        </div>
      </div>

      {storageStatus ? (
        <Alert variant={usingS3 ? 'default' : 'destructive'}>
          {usingS3 ? <Cloud className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
          <AlertTitle>
            {usingS3 ? 'Active storage: Amazon S3' : 'Active storage: Local disk'}
          </AlertTitle>
          <AlertDescription>{storageStatus.message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading S3 configuration…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s3-bucket">S3 bucket name (optional if Access Point is set)</Label>
              <Input
                id="s3-bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                placeholder="my-cms-media-bucket"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s3-region">AWS region</Label>
              <Input
                id="s3-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="us-east-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s3-access-point">S3 Access Point ARN (optional)</Label>
            <Input
              id="s3-access-point"
              value={accessPointArn}
              onChange={(e) => setAccessPointArn(e.target.value)}
              placeholder="arn:aws:s3:us-east-1:123456789012:accesspoint/my-ap"
            />
            <p className="text-xs text-muted-foreground">
              When set, uploads and reads go through this Access Point instead of the bucket name.
              You still need Access Key ID and Secret Access Key.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s3-endpoint">Custom endpoint / Access Point alias (optional)</Label>
            <Input
              id="s3-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://… or my-ap-123456789012.s3-accesspoint.region.amazonaws.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s3-prefix">Object key prefix</Label>
            <Input
              id="s3-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="nextcms-media"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s3-public-url">Public URL base / CDN (recommended)</Label>
            <Input
              id="s3-public-url"
              value={publicUrlBase}
              onChange={(e) => setPublicUrlBase(e.target.value)}
              placeholder="https://cdn.example.com or https://my-bucket.s3.region.amazonaws.com"
            />
            <p className="text-xs text-muted-foreground">
              Used for durable image URLs stored in the CMS. For private buckets, use a CloudFront
              URL that can read your objects.
            </p>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s3-access-key">AWS access key ID</Label>
              <Input
                id="s3-access-key"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIA…"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">{accessKeyHint}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s3-secret-key">AWS secret access key</Label>
              <Input
                id="s3-secret-key"
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder="Leave blank to keep existing secret"
                autoComplete="new-password"
              />
            </div>
          </div>

          {connectionMessage ? (
            <p className="text-sm text-muted-foreground">{connectionMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={saving || testing}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save S3 configuration'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleTest} disabled={saving || testing}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing…
                </>
              ) : (
                'Test connection'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
