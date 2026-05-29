import { z } from 'zod';
import { objectId, contentBlockSchema, blogSeoSchema } from './common';

export const blogStatusEnum = z.enum(['draft', 'published', 'scheduled', 'archived']);

export const createBlogSchema = z.object({
  pageName: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  contentBlocks: z.array(contentBlockSchema).optional(),
  featuredImage: z.string().optional(),
  // Structured references (preferred) + legacy free-text fields (back-compat).
  categories: z.array(objectId).optional(),
  tags: z.array(objectId).optional(),
  authorId: objectId.optional(),
  category: z.string().optional(),
  authorName: z.string().optional(),
  seo: blogSeoSchema.optional(),
  status: blogStatusEnum.optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;

export const listBlogsQuerySchema = z.object({
  status: blogStatusEnum.optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});
