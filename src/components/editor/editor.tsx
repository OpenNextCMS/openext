'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import LeftSidebar from './left-sidebar';
import RightSidebar from './right-sidebar';
import Block from './blocks';
import Canvas from './canvas';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Toolbar from './toolbar';
import StatusBar from './status-bar';
import { Suspense } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { addBlock, addBlockToColumn, setViewMode } from '@/redux/canvasSlice';

// interface BlockData {
//   uniqueId: string;
//   content: string;
//   type: 'column' | 'text';
//   children?: BlockData[][];
//   style?: Record<string, string>;
//   icon?: string; // Only allow string for icon names, not React elements
// }

export default function Editor() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const dispatch = useAppDispatch();
  const canvasBlocks = useAppSelector((state) => state.canvas.blocks);
  const viewMode = useAppSelector((state) => state.canvas.viewMode);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    setShowLeftSidebar(false);
    setShowButton(!showButton);
  };

  const handleViewChange = (mode: 'desktop' | 'tablet' | 'mobile') => {
    setViewMode(mode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const blockData = active.data.current;

    if (over.id === 'canvas') {
      console.log('Adding new block to canvas root');

      const newBlock = {
        content: blockData?.content || '',
        type: blockData?.type || 'text',
        icon: blockData?.id || 'defaultIcon',
        uniqueId: uuidv4(),
        style: blockData?.style || {},
        // Add children for column blocks
        ...(blockData?.type === 'column'
          ? {
              children:
                blockData.id === '1-column'
                  ? [[]]
                  : blockData.id === '2-column'
                    ? [[], []]
                    : blockData.id === '3-column'
                      ? [[], [], []]
                      : [],
            }
          : {}),
      };

      dispatch(addBlock(newBlock));
      console.log('Block payload before dispatch:', newBlock);
    }

    // Similar modification for column addition logic
    if (over.data.current?.type === 'column') {
      console.log('Adding block to column');
      const blockData = {
        ...active.data.current,
        icon: active.data.current?.id || 'defaultIcon',
        content: active.data.current?.content || '',
        type: active.data.current?.type || 'text',
        style: active.data.current?.style || {},
        uniqueId: uuidv4(),
        // Add children for column blocks
        ...(active.data.current?.type === 'column'
          ? {
              children:
                active.data.current.id === '1-column'
                  ? [[]]
                  : active.data.current.id === '2-column'
                    ? [[], []]
                    : active.data.current.id === '3-column'
                      ? [[], [], []]
                      : [],
            }
          : {}),
      };

      console.log('Block payload for column:', blockData);

      const actionPayload = {
        targetBlockId: over.data.current.blockId,
        columnIndex: over.data.current.columnIndex,
        newBlock: blockData,
      };

      console.log('Full action payload:', actionPayload);

      dispatch(addBlockToColumn(actionPayload));
    }
  };

  // const updateNestedBlock = (
  //   block: BlockData,
  //   targetBlockId: string,
  //   columnIndex: number,
  //   newBlock: BlockData
  // ): BlockData => {
  //   if (block.uniqueId === targetBlockId) {
  //     const updatedChildren = [...(block.children || [])];
  //     updatedChildren[columnIndex] = [...(updatedChildren[columnIndex] || []), newBlock];

  //     return { ...block, children: updatedChildren };
  //   }

  //   if (block.children) {
  //     return {
  //       ...block,
  //       children: block.children.map((col) =>
  //         col.map((child) => updateNestedBlock(child, targetBlockId, columnIndex, newBlock))
  //       ),
  //     };
  //   }

  //   return block;
  // };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-300">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex h-full overflow-hidden">
          {showButton && (
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className={`absolute ${showLeftSidebar ? 'left-64 rounded-r-full' : 'left-2 rounded-full'} top-3.5 z-10 h-8 w-8 border shadow-md transition-all duration-300 dark:border-border dark:bg-background`}
                onClick={() => {
                  setShowLeftSidebar(!showLeftSidebar);
                  setIsOpen(false);
                }}
              >
                {showLeftSidebar ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          <div
            className={`transition-all duration-300 ${showLeftSidebar ? 'w-64 border-r border-border' : 'w-0'}`}
          >
            <div className={`h-full ${!showLeftSidebar ? 'invisible' : ''}`}>
              <Suspense fallback={<div>Loading Sidebar...</div>}>
                <LeftSidebar />
              </Suspense>
            </div>
          </div>

          {isOpen && <Block toggleSidebar={toggleSidebar} />}

          <div className="flex flex-1 flex-col overflow-hidden">
            <Toolbar toggleSidebar={toggleSidebar} onViewChange={handleViewChange} />
            <Canvas canvasBlocks={canvasBlocks} viewMode={viewMode} />
          </div>

          <div
            className={`transition-all duration-300 ${showRightSidebar ? 'w-64 border-l border-border' : 'w-0'}`}
          >
            <div className={`h-full ${!showRightSidebar ? 'invisible' : ''}`}>
              <RightSidebar />
            </div>
          </div>

          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className={`absolute ${showRightSidebar ? 'right-64 rounded-l-full' : 'right-2 rounded-full'} top-2.5 z-10 h-8 w-8 border shadow-md transition-all duration-300 dark:border-border dark:bg-background`}
              onClick={() => setShowRightSidebar(!showRightSidebar)}
            >
              {showRightSidebar ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <StatusBar />
      </DndContext>
    </div>
  );
}
