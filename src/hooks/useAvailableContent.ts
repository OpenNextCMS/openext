import { useState, useEffect } from 'react';

export function useAvailableContent(needsContent: boolean) {
  const [availablePages, setAvailablePages] = useState<{ slug: string; pageName: string }[]>([]);
  const [availableBlogs, setAvailableBlogs] = useState<{ slug: string; pageName: string }[]>([]);

  useEffect(() => {
    if (!needsContent || (availablePages.length > 0 && availableBlogs.length > 0)) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    fetch(`${backendUrl}/api/pages/get-pages`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.pages) return;
        const allPages = data.pages as Array<{
          slug?: string;
          pageName?: string;
          pageType?: string;
        }>;

        const pages = allPages
          .filter((p) => !!p.slug && !!p.pageName && (p.pageType || 'page') === 'page')
          .map((p) => ({ slug: p.slug as string, pageName: p.pageName as string }));
        setAvailablePages(pages);

        const blogs = allPages
          .filter((p) => !!p.slug && !!p.pageName && p.pageType === 'blog')
          .map((p) => ({ slug: p.slug as string, pageName: p.pageName as string }));
        setAvailableBlogs(blogs);
      })
      .catch((err) => console.error('Failed to fetch pages/blogs for link picker:', err));
  }, [needsContent, availablePages.length, availableBlogs.length]);

  return { availablePages, availableBlogs };
}
