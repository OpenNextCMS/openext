'use client';

import RenderBlock from '@/components/editor/renderblock';
import type { BlockData } from '@/types/index';

/**
 * Renders a list of real CMS blocks at a reduced scale inside a fixed-height,
 * non-interactive frame — used to live-preview header / footer templates in the
 * wizard. Because it renders the actual blocks, the preview matches what the
 * generated site will look like.
 */
export function PreviewFrame({
  blocks,
  scale = 0.32,
  height = 170,
  className = '',
}: {
  blocks: BlockData[];
  scale?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-md border border-border bg-white ${className}`}
      style={{ height }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: `${100 / scale}%`, transform: `scale(${scale})` }}
      >
        {blocks.map((b, i) => (
          <RenderBlock key={b.uniqueId ?? i} block={b} isEditing={false} />
        ))}
      </div>
    </div>
  );
}
