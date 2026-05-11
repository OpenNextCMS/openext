// src/app/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { BlockData } from '@/types';
import PageClientWrapper from '@/components/PageClientWrapper';
import { Metadata } from 'next';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { headers } from 'next/headers';

interface PageProps {
  params?: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type Page = {
  slug: string;
  pageType?: 'page' | 'header' | 'footer';
  component: BlockData[];
};

async function getPageData(
  slug: string
): Promise<{ blocks: BlockData[]; headerBlocks: BlockData[]; footerBlocks: BlockData[] } | null> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get('host') || 'localhost:3000';
    const protocol =
      requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || `${protocol}://${host}`;

    const res = await fetch(`${backendUrl}/api/pages/get-page?name=${slug}&key=allowMe`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();
    const page = data?.page as Page | undefined;
    const header = data?.header as Page | undefined;
    const footer = data?.footer as Page | undefined;
    const isLayoutPart = page?.pageType === 'header' || page?.pageType === 'footer';

    return Array.isArray(page?.component)
      ? {
          blocks: page.component,
          headerBlocks: !isLayoutPart && Array.isArray(header?.component) ? header.component : [],
          footerBlocks: !isLayoutPart && Array.isArray(footer?.component) ? footer.component : [],
        }
      : null;
  } catch (err) {
    console.error('Error fetching page data:', err);
    return null;
  }
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

  const pageData = await getPageData(resolvedParams.slug);
  if (!pageData) return notFound();

  return (
    <PageClientWrapper>
      {/* Header outside of the main content wrapper */}
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
