'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Post {
  _id: string;
  pageName: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
}
interface Category {
  _id: string;
  name: string;
  slug: string;
}

function usePosts(params: Record<string, string>) {
  const [posts, setPosts] = useState<Post[]>([]);
  const key = JSON.stringify(params);
  useEffect(() => {
    const qs = new URLSearchParams({ status: 'published', ...params });
    fetch(`/api/blogs?${qs.toString()}`)
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setPosts(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return posts;
}

export function LatestPostsSection({ settings }: { settings: Record<string, unknown> }) {
  const count = Number(settings.count) || 6;
  const columns = Number(settings.columns) || 3;
  const posts = usePosts({ limit: String(count) });
  const colClass = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[
    columns
  ] || 'sm:grid-cols-3';

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="mb-6 text-2xl font-bold">{String(settings.title || 'Latest posts')}</h2>
      <div className={`grid grid-cols-1 gap-6 ${colClass}`}>
        {posts.map((p) => (
          <Link
            key={p._id}
            href={`/blog/${p.slug}`}
            className="group overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg"
          >
            {p.featuredImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.featuredImage} alt={p.pageName} className="h-44 w-full object-cover" />
            ) : null}
            <div className="space-y-1 p-4">
              <h3 className="font-semibold group-hover:text-primary">{p.pageName}</h3>
              {p.excerpt ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FeaturedPostSection({ settings }: { settings: Record<string, unknown> }) {
  const posts = usePosts({ limit: '50' });
  const post = posts.find((p) => p._id === settings.postId) || posts[0];
  if (!post) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
        {String(settings.title || 'Featured')}
      </p>
      <Link
        href={`/blog/${post.slug}`}
        className="group grid gap-6 overflow-hidden rounded-3xl border md:grid-cols-2"
      >
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featuredImage} alt={post.pageName} className="h-64 w-full object-cover" />
        ) : (
          <div className="h-64 w-full bg-muted" />
        )}
        <div className="flex flex-col justify-center gap-3 p-6">
          <h2 className="text-3xl font-black group-hover:text-primary">{post.pageName}</h2>
          {post.excerpt ? <p className="text-muted-foreground">{post.excerpt}</p> : null}
        </div>
      </Link>
    </section>
  );
}

export function CategoriesSection({ settings }: { settings: Record<string, unknown> }) {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setCategories(res.data))
      .catch(() => {});
  }, []);
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="mb-6 text-2xl font-bold">{String(settings.title || 'Categories')}</h2>
      <div className="flex flex-wrap gap-3">
        {categories.map((c) => (
          <Link
            key={c._id}
            href={`/blogs?category=${c._id}`}
            className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SidebarSection({ settings }: { settings: Record<string, unknown> }) {
  const recent = usePosts({ limit: '5' });
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    if (!settings.showCategories) return;
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setCategories(res.data))
      .catch(() => {});
  }, [settings.showCategories]);

  return (
    <aside className="space-y-6">
      {settings.showRecent ? (
        <div className="rounded-2xl border p-4">
          <h3 className="mb-3 font-bold">Recent posts</h3>
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p._id}>
                <Link href={`/blog/${p.slug}`} className="text-sm hover:text-primary">
                  {p.pageName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {settings.showCategories ? (
        <div className="rounded-2xl border p-4">
          <h3 className="mb-3 font-bold">Categories</h3>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c._id}>
                <Link href={`/blogs?category=${c._id}`} className="text-sm hover:text-primary">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
