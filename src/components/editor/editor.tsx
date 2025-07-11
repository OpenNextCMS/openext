'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import LeftSidebar from './left-sidebar';
import RightSidebar from './right-sidebar';
import Blocks from './blocks';
import Canvas from './canvas';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Toolbar from './toolbar';
import StatusBar from './status-bar';
import { Suspense } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { addBlock, addBlockToColumn, setCanvasState } from '@/redux/canvasSlice';
import { BlockDragData, Block } from '@/types/index';

// Define action creator for setViewMode
const setViewMode = (mode: 'desktop' | 'tablet' | 'mobile') => ({
  type: 'canvas/setViewMode',
  payload: mode,
});

// Define types for DroppableData
interface DroppableData {
  type?: string;
  blockId?: string;
  columnIndex?: number;
}

export default function Editor() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const dispatch = useAppDispatch();
  const canvasBlocks = useAppSelector((state) => state.canvas.blocks);
  const viewMode = useAppSelector((state) => state.canvas.viewMode);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';


  useEffect(() => {
    const getDBPageData = async () => {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const pageName = urlParams.get('pagename') || 'default';

      const persistKey = `persist:root-${pageName}`;
      const existing = localStorage.getItem(persistKey);
      console.log('Checking for existing persisted data:', existing);
      if (existing) return; // Already persisted, don't overwrite

      try {
        const response = await fetch(`${backendUrl}/api/pages/get-page?name=${pageName}`);
        if (!response.ok) {
          console.error('Failed to fetch page data');
          return;
        }

        const data = await response.json();
        console.log('Fetched data from backend:', data);
        const blocks = data?.page?.component || [];
        console.log('Fetched blocks from editor.tsx:', blocks);

        const newCanvasState = {
          blocks,
          viewMode: 'desktop' as 'desktop' | 'tablet' | 'mobile',
          selectedLabel: '',
          selectedBlock: null,
          selectedValue: null,
        };

        dispatch(setCanvasState(newCanvasState));
        // Redux-persist will now save this to localStorage
      } catch (error) {
        console.error('Error fetching canvas data:', error);
      }
    };

    getDBPageData();
  }, [dispatch, backendUrl]);


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
    dispatch(setViewMode(mode));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Type-safe handling of the data
    const blockData = active.data.current as BlockDragData;
    const overData = over.data.current as DroppableData;

    if (over.id === 'canvas') {
      console.log('Adding new block to canvas root');

      const newBlock = {
        content: blockData?.content || '',
        type:
          blockData?.type === 'text' || blockData?.type === 'column'
            ? (blockData.type as 'text' | 'column')
            : 'text',
        icon: blockData?.id || 'defaultIcon',
        uniqueId: uuidv4(),
        style: typeof blockData?.style === 'object' ? blockData.style : undefined,
        // Add children for column blocks
        ...(blockData?.type === 'column' // Compare the actual string value
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

    // Column addition logic with proper typing/
    if (overData?.type === 'column') {
      console.log('Adding block to column');

      const activeData = active.data.current as BlockDragData;

      const blockData = {
        ...activeData,
        icon: activeData?.id || 'defaultIcon',
        content: activeData?.content || '',
        type:
          activeData?.type === 'text' || activeData?.type === 'column'
            ? (activeData.type as 'text' | 'column')
            : 'text',
        style: typeof activeData?.style === 'object' ? activeData.style : undefined,
        uniqueId: uuidv4(),
        // Add children for column blocks
        ...(activeData?.type === 'column'
          ? {
            children:
              activeData.id === '1-column'
                ? [[]]
                : activeData.id === '2-column'
                  ? [[], []]
                  : activeData.id === '3-column'
                    ? [[], [], []]
                    : [],
          }
          : {}),
      };

      console.log('Block payload for column:', blockData);

      const actionPayload = {
        targetBlockId: overData.blockId || '',
        columnIndex: overData.columnIndex || 0,
        newBlock: blockData,
      };

      console.log('Full action payload:', actionPayload);

      dispatch(addBlockToColumn(actionPayload));
    }
  };

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

          {isOpen && <Blocks toggleSidebar={toggleSidebar} />}

          <div className="flex flex-1 flex-col overflow-hidden">
            <Toolbar toggleSidebar={toggleSidebar} onViewChange={handleViewChange} />
            <Canvas canvasBlocks={canvasBlocks as Block[]} viewMode={viewMode} />
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
