'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiUrl } from '@/lib/apiClient';
import {
  SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_LABELS,
} from '@/lib/social-media/constants';
import type { SocialPlatformId, SocialShareButtonStyle } from '@/types/social-media';
import { SocialPlatformIcon } from '@/components/social-media/SocialPlatformIcon';

export type SocialBlockContent = {
  url?: string;
  title?: string;
  style?: SocialShareButtonStyle;
  useConnectedPlatforms?: boolean;
  /** When true, follow dashboard Share settings button style. */
  useGlobalButtonStyle?: boolean;
  platforms?: SocialPlatformId[];
};

type ConnectedPlatform = {
  id: SocialPlatformId;
  label: string;
  profileUrl: string;
  shareEnabled: boolean;
};

interface SocialPluginPropertiesProps {
  content: SocialBlockContent;
  handleJsonContentChange: <T extends Record<string, unknown>>(
    content: T,
    key: keyof T,
    value: unknown
  ) => void;
}

export const SocialPluginProperties: React.FC<SocialPluginPropertiesProps> = ({
  content,
  handleJsonContentChange,
}) => {
  const [connected, setConnected] = useState<ConnectedPlatform[]>([]);
  const [globalStyle, setGlobalStyle] = useState<SocialShareButtonStyle>('icon-label');
  const [loading, setLoading] = useState(true);
  const typedContent = content as SocialBlockContent & Record<string, unknown>;

  useEffect(() => {
    let active = true;
    fetch(apiUrl('/api/social-media/public-config'), { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load');
        return json.data as {
          platforms: ConnectedPlatform[];
          buttonStyle?: SocialShareButtonStyle;
        };
      })
      .then((data) => {
        if (!active) return;
        setConnected(Array.isArray(data.platforms) ? data.platforms : []);
        if (
          data.buttonStyle === 'icon' ||
          data.buttonStyle === 'icon-label' ||
          data.buttonStyle === 'label'
        ) {
          setGlobalStyle(data.buttonStyle);
        }
      })
      .catch(() => {
        if (active) setConnected([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const useConnected = content.useConnectedPlatforms !== false;
  const explicitStyle =
    content.style === 'icon' || content.style === 'icon-label' || content.style === 'label'
      ? content.style
      : null;
  const useGlobalStyle =
    content.useGlobalButtonStyle === true
      ? true
      : content.useGlobalButtonStyle === false
        ? false
        : explicitStyle === null;
  const selectedPlatforms = useMemo(() => {
    if (Array.isArray(content.platforms) && content.platforms.length) return content.platforms;
    return connected.map((p) => p.id);
  }, [content.platforms, connected]);

  const displayStyle: SocialShareButtonStyle = useGlobalStyle
    ? globalStyle
    : explicitStyle || globalStyle;

  const patch = (
    key: keyof SocialBlockContent,
    value: unknown,
    extra?: Partial<SocialBlockContent>
  ) => {
    handleJsonContentChange(
      { ...typedContent, ...extra } as Record<string, unknown>,
      key as string,
      value
    );
  };

  const setDisplayStyle = (style: SocialShareButtonStyle) => {
    // Choosing a style on the block makes it stick for this block only.
    handleJsonContentChange(
      {
        ...typedContent,
        useGlobalButtonStyle: false,
        style,
      } as Record<string, unknown>,
      'style',
      style
    );
  };

  const togglePlatform = (id: SocialPlatformId, on: boolean) => {
    const base = selectedPlatforms.filter((p) => SOCIAL_PLATFORM_IDS.includes(p));
    const next = on ? [...new Set([...base, id])] : base.filter((p) => p !== id);
    patch('platforms', next, { useConnectedPlatforms: false });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase">Display style</Label>
        <Select value={displayStyle} onValueChange={(v) => setDisplayStyle(v as SocialShareButtonStyle)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="icon">Icons only</SelectItem>
            <SelectItem value="icon-label">Icons + labels</SelectItem>
            <SelectItem value="label">Labels only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 rounded border bg-muted/20 p-2">
        <div>
          <Label className="text-[11px]">Use Share settings style</Label>
          <p className="text-[10px] text-muted-foreground">
            Follow Social Media → Share settings (currently:{' '}
            {globalStyle === 'icon'
              ? 'Icons only'
              : globalStyle === 'label'
                ? 'Labels only'
                : 'Icons + labels'}
            )
          </p>
        </div>
        <Switch
          checked={useGlobalStyle}
          onCheckedChange={(v) => {
            if (v) {
              patch('useGlobalButtonStyle', true, { style: globalStyle });
            } else {
              patch('useGlobalButtonStyle', false, { style: displayStyle });
            }
          }}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase">Share title</Label>
        <Input
          className="h-8 text-sm"
          value={content.title || ''}
          onChange={(e) => patch('title', e.target.value)}
          placeholder="Share this page"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase">
          Share URL (optional)
        </Label>
        <Input
          className="h-8 text-sm"
          value={content.url || ''}
          onChange={(e) => patch('url', e.target.value)}
          placeholder="Defaults to current page URL"
        />
      </div>

      <div className="flex items-center justify-between gap-2 rounded border bg-muted/20 p-2">
        <div>
          <Label className="text-[11px]">Use connected platforms</Label>
          <p className="text-[10px] text-muted-foreground">
            Auto-show profiles enabled in Social Media settings
          </p>
        </div>
        <Switch
          checked={useConnected}
          onCheckedChange={(v) => {
            if (v) {
              patch('useConnectedPlatforms', true, {
                platforms: connected.map((p) => p.id),
              });
            } else {
              patch('useConnectedPlatforms', false, {
                platforms: selectedPlatforms,
              });
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground uppercase">
          Connected platforms
        </Label>
        {loading ? (
          <p className="text-[11px] text-muted-foreground">Loading…</p>
        ) : connected.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No platforms connected yet.{' '}
            <Link
              href="/dashboard/plugins/social-media/connections"
              className="text-primary underline"
            >
              Connect profiles
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {connected.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <SocialPlatformIcon platform={p.id} size={16} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium">
                      {SOCIAL_PLATFORM_LABELS[p.id] || p.label}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">{p.profileUrl}</p>
                  </div>
                </div>
                <Switch
                  checked={useConnected || selectedPlatforms.includes(p.id)}
                  disabled={useConnected}
                  onCheckedChange={(on) => togglePlatform(p.id, on)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
