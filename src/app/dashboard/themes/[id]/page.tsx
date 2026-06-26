'use client';

import { use } from 'react';
import { ThemeBuilder } from '@/components/theme-builder/ThemeBuilder';

/** Theme editor page — hosts the tabbed builder + live preview for one theme. */
export default function ThemeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-6">
      <ThemeBuilder themeId={id} />
    </div>
  );
}
