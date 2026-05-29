import { z } from 'zod';
import { objectId } from './common';

// Categories
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentCategory: objectId.nullable().optional(),
});
export const updateCategorySchema = createCategorySchema.partial();

// Tags
export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
});
export const updateTagSchema = createTagSchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
