// src/app/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { BlockData } from '@/types';
import PageClientWrapper from '@/components/PageClientWrapper';
import { Metadata } from 'next';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { hasVerticalHeader } from '@/utils/headerLayout';
import { getPageDataForSlug } from '@/utils/getPageData';

export const revalidate = 30;

interface PageProps {
  params?: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Page: ${resolvedParams?.slug ?? 'Unknown'}`,
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  if (!resolvedParams) return notFound();

  const pageData = await getPageDataForSlug(resolvedParams.slug);
  if (!pageData) return notFound();

  const sidebarHeader = hasVerticalHeader(pageData.headerBlocks);

  if (sidebarHeader) {
    return (
      <PageClientWrapper>
        <div className="flex min-h-screen">
          <aside className="w-64 flex-shrink-0 sticky top-0 self-start h-screen overflow-y-auto">
            {pageData.headerBlocks.map((block) => renderFromJson(block as BlockData))}
          </aside>
          <div className="flex-1 flex flex-col min-h-screen bg-gray-50 dark:bg-black">
            <main className="flex-1 p-8">
              <div className="max-w-screen-xl mx-auto space-y-4">
                {pageData.blocks.map((block) => renderFromJson(block as BlockData))}
              </div>
            </main>
            {pageData.footerBlocks.map((block) => renderFromJson(block as BlockData))}
          </div>
        </div>
      </PageClientWrapper>
    );
  }

  return (
    <PageClientWrapper>
      {pageData.headerBlocks.map((block) => renderFromJson(block as BlockData))}

      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <main className="p-8">
          <div className="max-w-screen-xl mx-auto space-y-4">
            {pageData.blocks.map((block) => renderFromJson(block as BlockData))}
          </div>
        </main>
        {pageData.footerBlocks.map((block) => renderFromJson(block as BlockData))}
      </div>
    </PageClientWrapper>
  );
}
