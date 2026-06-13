import BlogThemeProvider from '@/components/blog/design/BlogThemeProvider';
import LayoutRenderer from '@/components/blog/layout/renderers';
import BlogListing from '@/components/blog/public/BlogListing';
import { getPageDbConnection, getLayoutModel } from '@/utils/db';
import { getGlobalLayoutBlocks } from '@/utils/getPageData';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import SiteThemeProvider from '@/providers/SiteThemeProvider';
import type { BlockData, LayoutSection } from '@/types/index';

export const revalidate = 60;

async function getActiveLayout(): Promise<{ sections: LayoutSection[] } | null> {
  try {
    const pageDb = await getPageDbConnection();
    const Layout = getLayoutModel(pageDb);
    const doc = await Layout.findOne({ isActive: true }).lean().exec();
    return doc as { sections: LayoutSection[] } | null;
  } catch {
    return null;
  }
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [layout, { headerBlocks, footerBlocks }] = await Promise.all([
    getActiveLayout(),
    getGlobalLayoutBlocks(),
  ]);

  return (
    <>
      {headerBlocks.length > 0 ? (
        <SiteThemeProvider>
          <div className="rendered-page">
            {headerBlocks.map((block) => renderFromJson(block as BlockData))}
          </div>
        </SiteThemeProvider>
      ) : null}

      <BlogThemeProvider>
        {layout ? <LayoutRenderer layout={layout} /> : null}
        <div className="mx-auto max-w-6xl px-4 py-10" style={{ maxWidth: 'var(--layout-width, 1200px)' }}>
          {!layout ? (
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-black tracking-tight">Blog</h1>
              <p className="mt-2 text-muted-foreground">Latest articles and updates.</p>
            </div>
          ) : null}
          <BlogListing initialCategory={category} />
        </div>
      </BlogThemeProvider>

      {footerBlocks.length > 0 ? (
        <SiteThemeProvider>
          <div className="rendered-page">
            {footerBlocks.map((block) => renderFromJson(block as BlockData))}
          </div>
        </SiteThemeProvider>
      ) : null}
    </>
  );
}
