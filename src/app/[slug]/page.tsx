// src/app/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { BlockData } from '@/types';
import PageClientWrapper from '@/components/PageClientWrapper';
import { Metadata } from 'next';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';

interface PageProps {
  params?: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type Page = {
  slug: string;
  component: BlockData[];
};

async function getPageData(slug: string): Promise<{ blocks: BlockData[] } | null> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const res = await fetch(`${backendUrl}/api/pages/get-page?name=${slug}&key=allowMe`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();
    // const page = data?.page?.find((p: Page) => p.slug === slug);
    const page = data?.page?.component;
    return page ? { blocks: page} : null;
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
      <main className="min-h-screen bg-gray-50 dark:bg-black p-8">
        <div className="max-w-screen-xl mx-auto space-y-4">
          {pageData.blocks.map((block) => renderFromJson(block as BlockData))}
        </div>
      </main>
    </PageClientWrapper>
  );
}
