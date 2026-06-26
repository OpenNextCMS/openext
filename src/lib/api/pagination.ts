export interface PaginationParams {
  page: number;
  limit: number;
  cursor?: string;
}

/**
 * Parse `?page=&limit=&cursor=` query params with sane defaults/bounds.
 * - page-based pagination uses page+limit
 * - infinite scroll uses cursor (an ISO date of the last item's createdAt)
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const rawLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const cursor = searchParams.get('cursor') || undefined;
  return { page, limit, cursor };
}
