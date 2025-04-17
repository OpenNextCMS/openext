'use client';

import { useEffect, useState } from 'react';
import RenderBlock from '@/components/editor/renderblock';
import { ThemeProvider } from 'next-themes';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';

import type { Block } from '@/types';

interface CanvasData {
  blocks: Block[];
  viewMode: 'desktop' | 'tablet' | 'mobile';
}

export default function PreviewPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('persist:root');
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const canvasData: CanvasData = JSON.parse(parsed.canvas);
      setBlocks(canvasData.blocks || []);
      setViewMode(canvasData.viewMode || 'desktop');
    } catch (err) {
      console.error('Failed to load preview data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWidthClass = () => {
    switch (viewMode) {
      case 'tablet':
        return 'max-w-[768px]';
      case 'mobile':
        return 'max-w-[480px]';
      default:
        return 'max-w-full';
    }
  };

  if (loading) return <div className="p-6">Loading preview...</div>;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main className="min-h-screen bg-gray-50 dark:bg-black p-8">
            <div className={`mx-auto ${getWidthClass()} space-y-4`}>
              {blocks.length > 0 ? (
                blocks.map((block) => (
                  <RenderBlock key={block.uniqueId} block={block} isEditing={false} />
                ))
              ) : (
                <div className="text-center text-muted-foreground">No blocks to preview</div>
              )}
            </div>
          </main>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
