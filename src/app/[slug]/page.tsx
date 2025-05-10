import { notFound } from 'next/navigation';
import RenderBlock from '@/components/editor/renderblock';
import { Block } from '@/types';
import { cookies } from 'next/headers';
import PageClientWrapper from '@/components/PageClientWrapper';
import { Metadata } from 'next';

type Page = {
  slug: string;
  component: Block[];
};

// ✅ This is the correct type for dynamic page props in App Router
interface PageProps {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

// ✅ Fetch CMS page data
async function getPageData(slug: string): Promise<{ blocks: Block[] } | null> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();
    console.log('Cookie header being sent:', cookieHeader);

    const res = await fetch(`${backendUrl}/api/pages/get-pages`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
      credentials: 'include',
    });

    if (!res.ok) {
      console.error('API response error:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const page = data?.pages?.find((p: Page) => p.slug === slug);
    console.log('Page found:', page ? 'Yes' : 'No');
    return page ? { blocks: page.component } : null;
  } catch (err) {
    console.error('Error fetching page data:', err);
    return null;
  }
}

// ✅ generateMetadata must also use the same PageProps type
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Page: ${params.slug}`,
  };
}

// ✅ Main page component
export default async function Page({ params }: PageProps) {
  const pageData = await getPageData(params.slug);
  console.log('pageData', pageData);

  if (!pageData) return notFound();

  return (
    <PageClientWrapper>
      <main className="min-h-screen bg-white dark:bg-black p-8">
        <div className="max-w-full mx-auto space-y-4">
          {pageData.blocks.map((block) => (
            <RenderBlock key={block.uniqueId} block={block} isEditing={false} />
          ))}
        </div>
      </main>
    </PageClientWrapper>
  );
}
