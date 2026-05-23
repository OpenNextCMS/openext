'use client';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RenderBlock from './renderblock';
import { GripVertical, LayoutGrid, PlusSquare, MousePointerClick, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Block, BlockData } from '@/types/index';
import Box from './blocks/Box';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { hasVerticalHeader } from '@/utils/headerLayout';
import { removeBlock } from '@/redux/canvasSlice';

interface CanvasProps {
  canvasBlocks: Block[];
  viewMode: 'desktop' | 'tablet' | 'mobile';
}

function SortableCanvasBlock({ block }: { block: Block }) {
  const dispatch = useAppDispatch();
  const blockDisplay = (block.style?.display as string) || 'block';
  const isInlineDisplay = blockDisplay === 'inline' || blockDisplay === 'inline-block';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.uniqueId || '',
    data: {
      source: 'canvas-block',
      blockId: block.uniqueId,
    },
    disabled: !block.uniqueId,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (block.uniqueId) {
      dispatch(removeBlock(block.uniqueId));
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        display: isInlineDisplay ? 'inline-block' : 'block',
        width: isInlineDisplay ? block.style?.width || 'auto' : '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        verticalAlign: isInlineDisplay ? 'baseline' : undefined,
      }}
      className="group/sortable relative"
    >
      <div className="absolute left-[-35px] top-2 z-20 hidden group-hover/sortable:flex gap-1">
        <button
          type="button"
          className="h-7 w-7 flex cursor-grab items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-primary active:cursor-grabbing"
          title="Move block"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="h-7 w-7 flex items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-destructive hover:border-destructive"
          title="Delete block"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <RenderBlock block={block} isEditing={true} />
    </div>
  );
}

export default function Canvas({ canvasBlocks, viewMode }: CanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
  const [zoom, setZoom] = useState(100);
  const headerBlocks = useAppSelector((state) => state.canvas.headerBlocks);
  const footerBlocks = useAppSelector((state) => state.canvas.footerBlocks);

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
      className="flex-1 bg-muted/30 dark:bg-neutral-800 overflow-auto p-4 transition-colors duration-300"
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
          className={`bg-background dark:bg-background w-full h-auto shadow-md p-4 rounded-lg border ${getWidthClass()} transition-all mx-auto ${
            isOver ? 'border-primary border-dashed border-2' : 'border-border'
          } `}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
        >
          {hasVerticalHeader(headerBlocks as BlockData[]) ? (
            <div className="flex min-h-[750px]">
              <aside className="w-64 flex-shrink-0">
                <Box content="Header" blocks={headerBlocks} />
              </aside>
              <div className="flex-1 flex flex-col">
                <div className="flex-1">
                  {canvasBlocks.length > 0 ? (
                    <SortableContext
                      items={canvasBlocks.map((block) => block.uniqueId || '')}
                      strategy={verticalListSortingStrategy}
                    >
                      {canvasBlocks.map((block, index) => (
                        <SortableCanvasBlock
                          key={`${block.uniqueId || 'block'}-${index}`}
                          block={block}
                        />
                      ))}
                    </SortableContext>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[750px] border-2 border-dashed rounded-lg p-6">
                      {isOver ? (
                        <div className="animate-pulse">
                          <MousePointerClick className="h-12 w-12 text-primary mb-4" />
                          <h3 className="text-lg font-medium mb-2 text-primary">
                            Drop here to add block
                          </h3>
                        </div>
                      ) : (
                        <>
                          <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">Your canvas is empty</h3>
                          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                            Drag and drop blocks from the sidebar to start building your page
                            layout
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <Box content="Footer" blocks={footerBlocks} />
              </div>
            </div>
          ) : (
            <>
              <Box content="Header" blocks={headerBlocks} />
              {canvasBlocks.length > 0 ? (
                <SortableContext
                  items={canvasBlocks.map((block) => block.uniqueId || '')}
                  strategy={verticalListSortingStrategy}
                >
                  {canvasBlocks.map((block, index) => (
                    <SortableCanvasBlock
                      key={`${block.uniqueId || 'block'}-${index}`}
                      block={block}
                    />
                  ))}
                </SortableContext>
              ) : (
                <div className="flex flex-col items-center justify-center h-[750px] border-2 border-dashed rounded-lg p-6">
                  {isOver ? (
                    <div className="animate-pulse">
                      <MousePointerClick className="h-12 w-12 text-primary mb-4" />
                      <h3 className="text-lg font-medium mb-2 text-primary">
                        Drop here to add block
                      </h3>
                    </div>
                  ) : (
                    <>
                      <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Your canvas is empty</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                        Drag and drop blocks from the sidebar to start building your page layout
                      </p>
                      <div className="text-sm text-muted-foreground">
                        Tip: Click the
                        <span className="inline-flex items-center mx-1 px-2 py-1 rounded bg-muted">
                          <PlusSquare className="h-3 w-3 mr-1" /> Add Block
                        </span>
                        button to add new blocks
                      </div>
                    </>
                  )}
                </div>
              )}
              <Box content="Footer" blocks={footerBlocks} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
