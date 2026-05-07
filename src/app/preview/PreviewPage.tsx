// app/preview/PreviewPage.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { safeStorageGet } from '@/utils/safeStorage';

import type { BlockData, Page } from '@/types';

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const fullPageName = searchParams.get('pagename') || '';
  const pagename = fullPageName.split('/')[0]; // Extract the actual page name before any sub-paths

  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    const loadDraftData = () => {
      const draft = safeStorageGet(`preview:draft-${pagename}`);
      if (draft) {
        const parsedDraft = JSON.parse(draft) as BlockData[];
        if (Array.isArray(parsedDraft)) return parsedDraft;
      }

      const persisted = safeStorageGet(`persist:root-${pagename}`);
      if (!persisted) return null;

      const parsedPersisted = JSON.parse(persisted);
      const canvas = JSON.parse(parsedPersisted.canvas || '{}');
      return Array.isArray(canvas.blocks) ? (canvas.blocks as BlockData[]) : null;
    };

    const loadData = async () => {
      try {
        const draftBlocks = loadDraftData();
        if (draftBlocks) {
          setBlocks(draftBlocks);
          return;
        }

        const url = pagename
          ? `${backendUrl}/api/pages/get-page?name=${encodeURIComponent(pagename)}&key=allowMe`
          : `${backendUrl}/api/pages/get-pages`;

        const res = await fetch(url, {
          cache: 'no-store',
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch preview page (${res.status})`);
        }

        const data = await res.json();
        const page = pagename
          ? data?.page
          : data?.pages?.find((item: Page) => item.isHome === true);

        if (!Array.isArray(page?.component)) {
          setBlocks([]);
          return;
        }

        setBlocks(page.component);
      } catch (err) {
        console.error('Failed to load preview data:', err);
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pagename]);

  if (loading) return <div className="p-6">Loading preview...</div>;

  return (
    <div>
      {blocks.length > 0 ? (
        blocks.map((block) => renderFromJson(block))
      ) : (
        <div className="p-6 text-center text-muted-foreground">No blocks to preview</div>
      )}
    </div>
  );
}
