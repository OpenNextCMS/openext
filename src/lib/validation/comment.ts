import { z } from 'zod';
import { objectId } from './common';

/** Public comment submission. Status is always forced to "pending" server-side. */
export const createCommentSchema = z.object({
  blogId: objectId,
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('A valid email is required'),
  comment: z.string().min(1, 'Comment cannot be empty').max(5000),
});

/** Admin moderation. */
export const updateCommentSchema = z.object({
  status: z.enum(['pending', 'approved', 'spam']),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
