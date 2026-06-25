import { v4 as uuidv4 } from 'uuid';
import type { CSSProperties } from 'react';
import type { BlockData } from '@/types/index';

/**
 * Build a single editable CMS block. Every generated block follows the same
 * persisted shape the visual editor expects: a stable `uniqueId`, a `type` from
 * the existing block union, and a JSON-string `content` payload that the block's
 * component parses (see e.g. src/components/ui/HeroMain.tsx). Generated blocks
 * carry no inline color/typography so they inherit the active theme's CSS
 * variables — exactly like blocks added by hand in the editor.
 */
export function makeBlock(
  type: BlockData['type'],
  content: Record<string, unknown> = {},
  style: CSSProperties = {}
): BlockData {
  return {
    uniqueId: uuidv4(),
    type,
    content: JSON.stringify(content),
    style,
  };
}
