'use client';

import React from 'react';
import type { Block } from '@/types/index';
import type { BlockData } from '@/redux/canvasSlice';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectElement } from '@/redux/canvasSlice';
import { getStyleAtPath } from '@/lib/editor/stylePath';

interface EditableElementProps {
  block: Block;
  /** Dotted per-item path, e.g. `features.2.cardStyle`. */
  path: string;
  isEditing?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** Base inline styles; the stored per-item style is merged on top. */
  baseStyle?: React.CSSProperties;
  children?: React.ReactNode;
  /** Optional extra onClick for non-editing mode (e.g. a link's behaviour). */
  onClick?: (e: React.MouseEvent) => void;
  /** Extra DOM props passed through to the element (e.g. href, target, alt, src). */
  extraProps?: Record<string, unknown>;
}

/**
 * Wraps a stylable inner element (card/icon/image/button) of a readymade
 * section block so it can be:
 *  - clicked in the editor to select it for per-item styling
 *    (`selectElement({ block, part: path })`), with a selection outline, and
 *  - rendered with its stored per-item style applied (editor AND public site).
 *
 * The stored style lives in the block's `content` JSON at `path`
 * (see `src/lib/editor/stylePath.ts`).
 */
export function EditableElement({
  block,
  path,
  isEditing = false,
  as = 'div',
  className,
  baseStyle,
  children,
  onClick,
  extraProps,
}: EditableElementProps) {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.canvas.selectedBlock?.uniqueId);
  const selectedPart = useAppSelector((s) => s.canvas.selectedPart);

  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : {};
    } catch {
      return {};
    }
  }, [block.content]);

  const storedStyle = getStyleAtPath(content, path);
  const isSelected = isEditing && selectedId === block.uniqueId && selectedPart === path;

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation();
      e.preventDefault(); // don't follow links / trigger default actions while editing
      dispatch(selectElement({ block: block as unknown as BlockData, part: path }));
      return;
    }
    onClick?.(e);
  };

  const Tag = as as React.ElementType;

  return (
    <Tag
      className={className}
      onClick={handleClick}
      {...extraProps}
      style={{
        ...baseStyle,
        ...storedStyle,
        ...(isEditing ? { cursor: 'pointer' } : null),
        ...(isSelected
          ? { outline: '2px solid #3b82f6', outlineOffset: '2px' }
          : null),
      }}
    >
      {children}
    </Tag>
  );
}

export default EditableElement;
