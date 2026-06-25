import { z } from 'zod';
import { objectId } from './common';

export const trackEventSchema = z.object({
  type: z.enum(['view', 'read', 'search']),
  blogId: objectId.optional(),
  durationSec: z.number().min(0).max(86400).optional(),
  query: z.string().max(200).optional(),
});

export const summaryRangeSchema = z.enum(['7d', '30d', 'all']).default('7d');
