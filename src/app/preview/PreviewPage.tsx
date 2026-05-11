// app/preview/PreviewPage.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { safeStorageGet } from '@/utils/safeStorage';
import { hasVerticalHeader } from '@/utils/headerLayout';

import type { BlockData, Page } from '@/types';

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const fullPageName = searchParams.get('pagename') || '';
  const pageType = searchParams.get('pageType') || 'page';
  const pagename = fullPageName.split('/')[0]; // Extract the actual page name before any sub-paths

  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [headerBlocks, setHeaderBlocks] = useState<BlockData[]>([]);
  const [footerBlocks, setFooterBlocks] = useState<BlockData[]>([]);
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
        const loadLayoutBlocks = async () => {
          if (!pagename || pageType !== 'page') return;

          const layoutRes = await fetch(
            `${backendUrl}/api/pages/get-page?name=${encodeURIComponent(pagename)}&key=allowMe`,
            {
              cache: 'no-store',
              credentials: 'include',
            }
          );

          if (!layoutRes.ok) return;

          const layoutData = await layoutRes.json();
          setHeaderBlocks(
            Array.isArray(layoutData?.header?.component) ? layoutData.header.component : []
          );
          setFooterBlocks(
            Array.isArray(layoutData?.footer?.component) ? layoutData.footer.component : []
          );
        };

        const draftBlocks = loadDraftData();
        if (draftBlocks) {
          setBlocks(draftBlocks);
          await loadLayoutBlocks();
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
        const header = data?.header;
        const footer = data?.footer;

        if (!Array.isArray(page?.component)) {
          setBlocks([]);
          return;
        }

        setBlocks(page.component);
        if (pageType === 'page') {
          setHeaderBlocks(Array.isArray(header?.component) ? header.component : []);
          setFooterBlocks(Array.isArray(footer?.component) ? footer.component : []);
        }
      } catch (err) {
        console.error('Failed to load preview data:', err);
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pageType, pagename]);

  if (loading) return <div className="p-6">Loading preview...</div>;

  const sidebarHeader = hasVerticalHeader(headerBlocks);

  if (sidebarHeader) {
    return (
      <div className="flex min-h-screen">
        <aside className="w-64 flex-shrink-0 sticky top-0 self-start h-screen overflow-y-auto">
          {headerBlocks.map((block) => renderFromJson(block))}
        </aside>
        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1">
            {blocks.length > 0 ? (
              blocks.map((block) => renderFromJson(block))
            ) : (
              <div className="p-6 text-center text-muted-foreground">No blocks to preview</div>
            )}
          </main>
          {footerBlocks.map((block) => renderFromJson(block))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {headerBlocks.map((block) => renderFromJson(block))}
      {blocks.length > 0 ? (
        blocks.map((block) => renderFromJson(block))
      ) : (
        <div className="p-6 text-center text-muted-foreground">No blocks to preview</div>
      )}
      {footerBlocks.map((block) => renderFromJson(block))}
    </div>
  );
}
