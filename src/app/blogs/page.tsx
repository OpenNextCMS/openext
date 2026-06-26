'use client';

import React from 'react';
import { BlogFeed } from '@/components/ui/BlogFeed';
import PageClientWrapper from '@/components/PageClientWrapper';

// Mock a block for the public blogs page
const defaultBlogFeedBlock = {
  type: 'blog-feed',
  content: JSON.stringify({
    layout: 'editorial', // Premium editorial look for the main blogs page
    postsPerPage: 9,
    showAuthor: true,
    showDate: true,
    showReadingTime: true,
    showCategory: true,
    showSearch: true,
    showCategories: true,
    showExcerpt: true,
    showSocial: true,
    imageAspectRatio: '16/9',
    cardsPerRow: 3,
    borderRadius: 'rounded-2xl',
    paginationType: 'infinite-scroll'
  })
};

export default function BlogsPage() {
  return (
    <PageClientWrapper>
      <div className="min-h-screen bg-background">
        {/* We can add a global header here if available, or just the feed */}
        <main className="container mx-auto">
          <div className="py-12 px-4 text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Editorial</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto italic font-medium">
              Explore our latest thoughts, guides, and industry insights curated by our editorial team.
            </p>
          </div>
          
          <BlogFeed block={defaultBlogFeedBlock} isEditing={false} />
        </main>
      </div>
    </PageClientWrapper>
  );
}
