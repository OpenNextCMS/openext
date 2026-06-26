import { slugify } from '@/utils/blog';

/**
 * Synthesize a stable menu-item id from a nav-bar link's label + index.
 * Pure + client-safe (no DB imports) so both the server (header-detection) and
 * the runtime navbar hook compute identical ids.
 */
export function menuItemIdFor(label: string, index: number, parentId?: string): string {
  const base = slugify(label || '') || 'item';
  const id = `${base}-${index}`;
  return parentId ? `${parentId}__${id}` : id;
}
