'use client';

import { apiUrl } from '@/lib/apiClient';
// app/preview/PreviewPage.tsx

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { safeStorageGet } from '@/utils/safeStorage';
import SiteChromeLayout from '@/components/layout/SiteChromeLayout';
import ActiveThemeScope from '@/components/theme-preview/ActiveThemeScope';

import PageClientWrapper from '@/components/PageClientWrapper';

import type { BlockData, Page } from '@/types';
import { isThemeEngineCanvas } from '@/modules/themeEngine/bridges/pageBridge';
import { visibleCanvasBlocks } from '@/lib/editor/normalizePageBlocks';

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
      setLoading(true);
      try {
        const applyLayoutBlocks = (header: unknown, footer: unknown) => {
          setHeaderBlocks(
            Array.isArray((header as { component?: BlockData[] })?.component)
              ? (header as { component: BlockData[] }).component
              : []
          );
          setFooterBlocks(
            Array.isArray((footer as { component?: BlockData[] })?.component)
              ? (footer as { component: BlockData[] }).component
              : []
          );
        };

        const loadLayoutBlocks = async () => {
          if (!pagename) return;

          const layoutRes = await fetch(apiUrl(`/api/pages/get-page?name=${encodeURIComponent(pagename)}&key=allowMe`),
            {
              cache: 'no-store',
              credentials: 'include',
            }
          );

          if (!layoutRes.ok) return;

          const layoutData = await layoutRes.json();
          applyLayoutBlocks(layoutData?.header, layoutData?.footer);
        };

        const draftBlocks = loadDraftData();
        if (draftBlocks) {
          setBlocks(draftBlocks);
          await loadLayoutBlocks();
          return;
        }

        const url = pagename
          ? apiUrl(`/api/pages/get-page?name=${encodeURIComponent(pagename)}&key=allowMe`)
          : apiUrl(`/api/pages/get-pages`);

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
        applyLayoutBlocks(header, footer);
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

  const themeEnginePage = isThemeEngineCanvas(blocks);
  const previewBlocks = visibleCanvasBlocks(blocks);
  const previewHeader = themeEnginePage ? [] : headerBlocks;
  const previewFooter = themeEnginePage ? [] : footerBlocks;

  const pageContent =
    previewBlocks.length > 0 ? (
      previewBlocks.map((block) => renderFromJson(block))
    ) : (
      <div className="p-6 text-center text-muted-foreground">No blocks to preview</div>
    );

  return (
    <PageClientWrapper>
      {themeEnginePage ? (
        <div className="rendered-page">{pageContent}</div>
      ) : (
      <ActiveThemeScope>
        <SiteChromeLayout headerBlocks={previewHeader} footerBlocks={previewFooter}>
          {pageContent}
        </SiteChromeLayout>
      </ActiveThemeScope>
      )}
    </PageClientWrapper>
  );
}
