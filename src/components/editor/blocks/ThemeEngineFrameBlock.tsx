'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Palette, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { BlockRendererProps } from '@/types/index';
import type { BlockData } from '@/redux/canvasSlice';
import { useAppSelector } from '@/redux/hooks';
import { Button } from '@/components/ui/button';
import ThemeSectionInspector from './ThemeSectionInspector';
import { extractThemeSectionBlocks } from '@/modules/themeEngine/bridges/pageBridge';

const HOST_SOURCE = 'theme-engine-edit-host';
const BRIDGE_SOURCE = 'theme-engine-edit-bridge';

function parseFrameContent(content: unknown): {
  slug: string;
  name: string;
  pageSlug: string;
  hasEditableSections: boolean;
} {
  try {
    const raw =
      typeof content === 'string'
        ? (JSON.parse(content || '{}') as Record<string, unknown>)
        : content && typeof content === 'object'
          ? (content as Record<string, unknown>)
          : {};
    return {
      slug: String(raw.slug || ''),
      name: String(raw.name || raw.slug || 'Theme'),
      pageSlug: String(raw.pageSlug || 'home'),
      hasEditableSections: Boolean(raw.hasEditableSections),
    };
  } catch {
    return { slug: '', name: 'Theme', pageSlug: 'home', hasEditableSections: false };
  }
}

/**
 * Exact Theme Engine canvas surface: iframes the real Header + Template + Footer
 * with an edit-aware bridge and schema-driven section inspector.
 */
export function ThemeEngineFrameBlock({ block, isEditing = true }: BlockRendererProps) {
  const { slug, name, pageSlug, hasEditableSections } = useMemo(
    () => parseFrameContent(block.content),
    [block.content]
  );
  const allBlocks = useAppSelector((s) => s.canvas.blocks);
  const [loaded, setLoaded] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const src = useMemo(() => {
    if (!slug) return '';
    const params = new URLSearchParams({ page: pageSlug });
    if (draftKey) params.set('draft', draftKey);
    return `/theme-engine-edit-preview/${encodeURIComponent(slug)}?${params.toString()}`;
  }, [slug, pageSlug, draftKey]);

  const postToFrame = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: HOST_SOURCE, type, ...payload },
      window.location.origin
    );
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== BRIDGE_SOURCE) return;
      if (data.type === 'section-selected' && data.sectionId) {
        setSelectedSectionId(String(data.sectionId));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!selectedSectionId) return;
    postToFrame('select-section', { sectionId: selectedSectionId });
  }, [selectedSectionId, postToFrame, frameKey]);

  const onDraftPreview = useCallback(
    (blocks: BlockData[]) => {
      if (!slug) return;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(async () => {
        try {
          const sectionBlocks = extractThemeSectionBlocks(blocks);
          const res = await fetch('/api/theme-engine/preview-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              themeSlug: slug,
              pageSlug,
              blocks: sectionBlocks,
            }),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            throw new Error(json?.error?.message || 'Draft preview failed');
          }
          setLoaded(false);
          setDraftKey(String(json.data.draftKey));
          setFrameKey((k) => k + 1);
        } catch (e) {
          toast.error((e as Error).message);
        }
      }, 450);
    },
    [slug, pageSlug]
  );

  if (!slug) {
    return (
      <div className="flex min-h-[240px] items-center justify-center border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        Theme Engine frame is missing a theme slug.
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-neutral-950" data-theme-engine-frame={slug}>
      {isEditing ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
          <Palette className="h-3.5 w-3.5 shrink-0" />
          <span>
            Theme Engine · <strong className="text-white">{name}</strong>
          </span>
          <span className="text-neutral-500">
            {hasEditableSections || allBlocks.length > 1
              ? 'Exact theme · editable sections'
              : 'Exact theme render'}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-neutral-200 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setLoaded(false);
                setDraftKey(null);
                setFrameKey((k) => k + 1);
              }}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-neutral-200 hover:bg-white/10 hover:text-white"
              onClick={() => {
                window.open(`/${encodeURIComponent(pageSlug)}`, '_blank', 'noopener');
              }}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Open site
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative w-full" style={{ minHeight: isEditing ? 900 : 600 }}>
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/80">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={frameKey}
          src={src}
          title={`${name} theme`}
          className="block w-full border-0 bg-transparent"
          style={{ height: isEditing ? 1100 : 900 }}
          sandbox="allow-same-origin allow-scripts"
          onLoad={() => setLoaded(true)}
        />
      </div>

      {isEditing ? (
        <ThemeSectionInspector
          themeSlug={slug}
          pageSlug={pageSlug}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
          onDraftPreview={onDraftPreview}
        />
      ) : null}
    </div>
  );
}

export default ThemeEngineFrameBlock;
