import type { ContentBlock, BlogSeo, BlogStatus } from '@/types/index';

/** The working copy of a blog post held in the editor's React state. */
export interface EditorPost {
  _id?: string;
  pageName: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  authorId: string;
  categories: string[];
  tags: string[];
  contentBlocks: ContentBlock[];
  seo: BlogSeo;
  status: BlogStatus;
  scheduledAt?: string | null;
  commentsEnabled: boolean;
}

export interface Option {
  _id: string;
  name: string;
}

export interface EditorOptions {
  authors: Option[];
  categories: Option[];
  tags: Option[];
}

export function emptyPost(): EditorPost {
  return {
    pageName: '',
    slug: '',
    excerpt: '',
    featuredImage: '',
    authorId: '',
    categories: [],
    tags: [],
    contentBlocks: [],
    seo: { index: true },
    status: 'draft',
    scheduledAt: null,
    commentsEnabled: true,
  };
}
