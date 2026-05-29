'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trackSearch } from '@/lib/analytics/track';

interface Post {
  _id: string;
  pageName: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  readingTime?: number;
}
interface Category {
  _id: string;
  name: string;
}

const LIMIT = 9;

export default function BlogListing({ initialCategory }: { initialCategory?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState(initialCategory ?? '');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'infinite' | 'pages'>('infinite');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setCategories(res.data))
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (opts: { reset: boolean; page: number }) => {
      setLoading(true);
      const qs = new URLSearchParams({
        status: 'published',
        limit: String(LIMIT),
        page: String(opts.page),
      });
      if (category) qs.set('category', category);
      if (search.trim()) qs.set('search', search.trim());
      try {
        const res = await fetch(`/api/blogs?${qs.toString()}`).then((r) => r.json());
        const data: Post[] = res?.data ?? [];
        setTotal(res?.meta?.total ?? data.length);
        setHasMore(!!res?.meta?.hasMore);
        setPosts((prev) => (opts.reset ? data : [...prev, ...data]));
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    [category, search]
  );

  // Reset + reload when filters/search change (debounced); log search queries.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim()) trackSearch(search);
      setPage(1);
      load({ reset: true, page: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [category, search, load]);

  // Infinite scroll.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== 'infinite' || !hasMore) return;
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        const next = page + 1;
        setPage(next);
        load({ reset: false, page: next });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [mode, hasMore, loading, page, load]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const goToPage = (p: number) => {
    setPage(p);
    load({ reset: true, page: p });
  };
  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load({ reset: false, page: next });
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search posts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-lg border p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode('infinite')}
              className={`rounded px-2 py-1 ${mode === 'infinite' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              Infinite
            </button>
            <button
              type="button"
              onClick={() => setMode('pages')}
              className={`rounded px-2 py-1 ${mode === 'pages' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              Pages
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p._id}
            href={`/blog/${p.slug}`}
            className="group overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg"
          >
            {p.featuredImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.featuredImage} alt={p.pageName} className="h-48 w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-48 w-full bg-muted" />
            )}
            <div className="space-y-2 p-5">
              <h3 className="font-bold group-hover:text-primary">{p.pageName}</h3>
              {p.excerpt ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
              ) : null}
              {p.readingTime ? (
                <p className="text-xs text-muted-foreground">{p.readingTime} min read</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      {!loading && posts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No posts found.</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {/* Pagination footer */}
      {mode === 'infinite' ? (
        <div ref={sentinel} className="h-10">
          {hasMore && !loading ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore}>
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
