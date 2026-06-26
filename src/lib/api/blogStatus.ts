import type { BlogStatus } from '@/types/index';
import { ApiError } from './errors';

/**
 * Shape of the fields a status change writes onto a blog Page. Kept in sync
 * with the legacy `isPublished`/`publishDate` fields so the existing publish
 * toggle and public reads keep working alongside the new `status` field.
 */
export interface StatusFields {
  status: BlogStatus;
  isPublished: boolean;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  publishDate?: Date | null;
}

/**
 * Resolve the persisted fields for a target status.
 * - published: stamps publishedAt (preserving an existing one), isPublished = true
 * - scheduled: requires a future scheduledAt, isPublished = false
 * - draft / archived: isPublished = false
 */
export function resolveStatusFields(
  status: BlogStatus,
  opts: { scheduledAt?: Date | null; existingPublishedAt?: Date | null } = {}
): StatusFields {
  switch (status) {
    case 'published': {
      const publishedAt = opts.existingPublishedAt ?? new Date();
      return {
        status,
        isPublished: true,
        publishedAt,
        publishDate: publishedAt,
        scheduledAt: null,
      };
    }
    case 'scheduled': {
      if (!opts.scheduledAt || opts.scheduledAt.getTime() <= Date.now()) {
        throw new ApiError('A future scheduledAt is required to schedule a post', 400, {
          scheduledAt: 'Must be a date in the future',
        });
      }
      return { status, isPublished: false, scheduledAt: opts.scheduledAt };
    }
    case 'archived':
      return { status, isPublished: false };
    case 'draft':
    default:
      return { status: 'draft', isPublished: false };
  }
}
