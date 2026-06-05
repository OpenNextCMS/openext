import { notFound } from 'next/navigation';
import { BlockData } from '@/types';
import PageClientWrapper from '@/components/PageClientWrapper';
import SiteThemeProvider from '@/providers/SiteThemeProvider';
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
  const pageData = await getPageDataForSlug(resolvedParams?.slug || '');
  
  return {
    title: pageData?.metadata?.pageName || `Page: ${resolvedParams?.slug ?? 'Unknown'}`,
    description: pageData?.metadata?.description || '',
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
        <SiteThemeProvider>
          <div className="flex min-h-screen">
            <aside className="w-64 flex-shrink-0 sticky top-0 self-start h-screen overflow-y-auto">
              {pageData.headerBlocks.map((block) => renderFromJson(block as BlockData))}
            </aside>
            <div className="flex-1 flex flex-col min-h-screen bg-white">
              <main className="flex-1">
                <div>
                  {pageData.blocks.map((block) => renderFromJson(block as BlockData))}
                </div>
              </main>
              {pageData.footerBlocks.map((block) => renderFromJson(block as BlockData))}
            </div>
          </div>
        </SiteThemeProvider>
      </PageClientWrapper>
    );
  }

  return (
    <PageClientWrapper>
      <SiteThemeProvider>
        {pageData.headerBlocks.map((block) => renderFromJson(block as BlockData))}

        <div className="min-h-screen">
          <main>
            <div>
              {pageData.blocks.map((block) => renderFromJson(block as BlockData))}
            </div>
          </main>
          {pageData.footerBlocks.map((block) => renderFromJson(block as BlockData))}
        </div>
      </SiteThemeProvider>
    </PageClientWrapper>
  );
}
