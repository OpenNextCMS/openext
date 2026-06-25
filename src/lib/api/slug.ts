import type { Model } from 'mongoose';
import { slugify } from '@/utils/blog';

/**
 * Generate a slug from `base` that is unique within the collection, appending
 * `-2`, `-3`, … on collision. Scope is the (per-tenant) collection itself.
 *
 * `excludeId` lets an update keep its own slug without colliding with itself.
 */
export async function generateUniqueSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  base: string,
  opts: { excludeId?: string; field?: string } = {}
): Promise<string> {
  const field = opts.field ?? 'slug';
  const root = slugify(base) || 'post';
  let candidate = root;
  let n = 1;

  // Bounded loop as a safety net against runaway iteration.
  for (let i = 0; i < 1000; i++) {
    const query: Record<string, unknown> = { [field]: candidate };
    if (opts.excludeId) query._id = { $ne: opts.excludeId };
    const existing = await model.findOne(query).select('_id').lean().exec();
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  // Extremely unlikely; fall back to a timestamped-ish suffix from the count.
  return `${root}-${Date.now().toString(36)}`;
}
