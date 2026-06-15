import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPostBySlug } from '@/lib/blog/getPost';
import { buildBlogMetadata } from '@/lib/seo/metadata';
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { getSiteUrl } from '@/lib/seo/url';
import JsonLd from '@/components/blog/JsonLd';
import { BlockRenderer } from '@/components/blog/blocks/renderers';
import BlogThemeProvider from '@/components/blog/design/BlogThemeProvider';
import AnalyticsBeacon from '@/components/blog/analytics/AnalyticsBeacon';
import CommentsSection from '@/components/blog/public/CommentsSection';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import SiteThemeProvider from '@/providers/SiteThemeProvider';
import { getGlobalLayoutBlocks } from '@/utils/getPageData';
import type { BlockData } from '@/types/index';

// SSR with periodic revalidation.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedPostBySlug(slug);
  if (!result) return { title: 'Post not found' };
  return buildBlogMetadata(result.post);
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublishedPostBySlug(slug);
  if (!result) notFound();

  const { post, movedFrom } = result;
  // 301 old slugs to the canonical URL.
  if (movedFrom && post.slug && post.slug !== slug) {
    redirect(`/blog/${post.slug}`);
  }

  const { headerBlocks, footerBlocks } = await getGlobalLayoutBlocks();

  const siteUrl = getSiteUrl();
  const author = post.authorId && typeof post.authorId === 'object' ? post.authorId : null;
  const publishedAt = post.publishedAt || post.publishDate;

  const jsonLd = [
    blogPostingJsonLd(post),
    breadcrumbJsonLd([
      { name: 'Blog', url: `${siteUrl}/blog` },
      { name: post.pageName, url: `${siteUrl}/blog/${post.slug}` },
    ]),
  ];

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
        <JsonLd data={jsonLd} />
        <AnalyticsBeacon blogId={String(post._id)} />

        <article className="mx-auto px-4 py-12" style={{ maxWidth: 'var(--layout-width, 768px)' }}>
        <div className="mx-auto max-w-3xl">
          <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to blog
          </Link>

          <header className="mt-4 space-y-4">
            {post.categories?.length ? (
              <div className="flex flex-wrap gap-2">
                {post.categories.map((c: { _id: string; name: string }) => (
                  <span
                    key={c._id}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            ) : null}

            <h1
              className="text-4xl font-black tracking-tight md:text-5xl"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {post.pageName}
            </h1>

            {post.excerpt ? <p className="text-lg text-muted-foreground">{post.excerpt}</p> : null}

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {author?.name ? <span>By {author.name}</span> : null}
              {publishedAt ? (
                <time dateTime={new Date(publishedAt).toISOString()}>
                  {new Date(publishedAt).toLocaleDateString()}
                </time>
              ) : null}
              {post.readingTime ? <span>· {post.readingTime} min read</span> : null}
            </div>
          </header>

          {post.featuredImage ? (
            <img
              src={post.featuredImage}
              alt={post.pageName}
              className="my-8 w-full rounded-2xl object-cover"
              loading="lazy"
            />
          ) : null}

          <div className="mt-6">
            <BlockRenderer blocks={post.contentBlocks} />
          </div>

          {post.commentsEnabled !== false ? (
            <CommentsSection blogId={String(post._id)} />
          ) : null}
        </div>
        </article>
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
