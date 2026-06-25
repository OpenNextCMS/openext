'use client';

import React from 'react';
import type { BlockRendererProps } from '@/types/index';
import { FormBlockEditor } from './FormBlock';
import { FormBlockRenderer } from './FormBlockRenderer';

/**
 * Registered page-builder component for the 'form-block' type. Branches on
 * isEditing: the builder shows the form selector + preview; the public site
 * renders the live form. Wired into renderblock.tsx's component map.
 */
export function FormBlock({ block, isEditing = true }: BlockRendererProps) {
  if (isEditing) {
    return <FormBlockEditor block={block} />;
  }
  return <FormBlockRenderer content={block.content} />;
}

export default FormBlock;
