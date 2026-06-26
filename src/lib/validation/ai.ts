import { z } from 'zod';

export const rewriteSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  instruction: z.string().min(1, 'An instruction is required'),
});

export const textOnlySchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export const generateFaqSchema = z.object({
  text: z.string().min(1, 'Topic or post text is required'),
  count: z.number().int().min(1).max(10).optional(),
});

export const metaDescriptionSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional().default(''),
});

export const seoTitleSchema = z.object({
  title: z.string().min(1),
  keyword: z.string().optional().default(''),
});

export const generateBlogSchema = z.object({
  topic: z.string().min(1, 'A topic is required'),
  tone: z.string().optional().default('professional'),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
});
