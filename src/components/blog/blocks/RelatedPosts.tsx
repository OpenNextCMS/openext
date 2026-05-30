'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RelatedPostsData } from './types';

interface RelatedPost {
  _id: string;
  pageName: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
}

/** Renders a grid of related posts queried from the blog API. */
export default function RelatedPosts({ data }: { data: RelatedPostsData }) {
  const [posts, setPosts] = useState<RelatedPost[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({
      status: 'published',
      limit: String(data.count || 3),
    });
    if (data.categoryId) params.set('category', data.categoryId);
    let active = true;
    fetch(`/api/blogs?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (active && Array.isArray(res?.data)) setPosts(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [data.count, data.categoryId]);

  if (posts.length === 0) return null;

  return (
    <section className="my-10">
      <h3 className="mb-4 text-xl font-bold">Related posts</h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post._id}
            href={`/blog/${post.slug}`}
            className="group overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg"
          >
            {post.featuredImage ? (
              <img
                src={post.featuredImage}
                alt={post.pageName}
                className="h-40 w-full object-cover"
              />
            ) : null}
            <div className="space-y-1 p-4">
              <h4 className="font-semibold group-hover:text-primary">{post.pageName}</h4>
              {post.excerpt ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
