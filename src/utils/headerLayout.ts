import type { BlockData } from '@/types/index';

export function hasVerticalHeader(blocks: BlockData[] | undefined | null): boolean {
  if (!Array.isArray(blocks)) return false;
  return blocks.some((b) => {
    if (b?.type !== 'nav-bar') return false;
    try {
      const parsed = typeof b.content === 'string' ? JSON.parse(b.content) : null;
      return parsed?.layout === 'vertical';
    } catch {
      return false;
    }
  });
}
