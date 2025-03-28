'use client';
import { useDroppable } from '@dnd-kit/core';
import RenderBlock from './renderblock';
import { LayoutGrid, PlusSquare, MousePointerClick } from 'lucide-react';
import { useState } from 'react';

interface CanvasProps {
  canvasBlocks: Array<{
    uniqueId: string;
    content: string;
    style?: string;
    type: 'column' | 'text';
  }>;
  viewMode: 'desktop' | 'tablet' | 'mobile';
}

export default function Canvas({ canvasBlocks, viewMode }: CanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => {
    if (zoom < 200) setZoom(zoom + 10);
  };

  const handleZoomOut = () => {
    if (zoom > 50) setZoom(zoom - 10);
  };

  const getWidthClass = () => {
    switch (viewMode) {
      case 'tablet':
        return 'max-w-[768px]'; // Tablet width
      case 'mobile':
        return 'max-w-[480px]'; // Mobile landscape width
      default:
        return 'max-w-full'; // Desktop width
    }
  };

  return (
    <div
      className="flex-1 bg-muted/30 dark:bg-muted/10 overflow-auto p-4 transition-colors duration-300"
      ref={setNodeRef}
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Canvas
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {canvasBlocks.length} {canvasBlocks.length === 1 ? 'block' : 'blocks'} added
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                disabled={zoom <= 50}
              >
                -
              </button>
              <span className="text-sm w-16 text-center">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                disabled={zoom >= 200}
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div
          className={`bg-background dark:bg-background w-full h-auto shadow-md p-4 rounded-lg border ${getWidthClass()} transition-all mx-auto ${isOver ? 'border-primary border-dashed border-2' : 'border-border'
            } `}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
        >
          {canvasBlocks.length > 0 ? (
            canvasBlocks.map((block) => <RenderBlock key={block.uniqueId} block={block} />)
          ) : (
            <div className="flex flex-col items-center justify-center h-[750px] border-2 border-dashed rounded-lg p-6">
              {isOver ? (
                <div className="animate-pulse">
                  <MousePointerClick className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-medium mb-2 text-primary">Drop here to add block</h3>
                </div>
              ) : (
                <>
                  <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Your canvas is empty</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    Drag and drop blocks from the sidebar to start building your page layout
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Tip: Click the{' '}
                    <span className="inline-flex items-center mx-1 px-2 py-1 rounded bg-muted">
                      <PlusSquare className="h-3 w-3 mr-1" /> Add Block
                    </span>{' '}
                    button to add new blocks
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
