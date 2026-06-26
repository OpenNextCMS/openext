import { z } from 'zod';

/** A 24-char hex Mongo ObjectId. */
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** A single content block in a blog body (data is type-specific, so loose). */
export const contentBlockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.unknown()).default({}),
  hidden: z.boolean().optional(),
});

/** Per-post SEO object. */
export const blogSeoSchema = z
  .object({
    title: z.string().max(70).optional(),
    description: z.string().max(200).optional(),
    keywords: z.array(z.string()).optional(),
    canonical: z.string().url().optional().or(z.literal('')),
    ogImage: z.string().optional(),
    index: z.boolean().optional(),
  })
  .partial();
