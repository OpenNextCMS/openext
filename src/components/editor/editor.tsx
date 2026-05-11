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
import {
  addBlock,
  addBlockToColumn,
  moveBlock,
  moveBlockToColumn,
  moveRowColumn,
  setCanvasState,
  setLayoutBlocks,
} from '@/redux/canvasSlice';
import { BlockDragData, Block } from '@/types/index';
import { safeStorageGet } from '@/utils/safeStorage';

type EditableBlockType = Block['type'];

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
  source?: string;
}

const editableBlockTypes: EditableBlockType[] = [
  'text',
  'column',
  'row',
  'hero',
  'stats',
  'progress',
  'countdown',
  'button',
  'icon',
  'input',
  'radio',
  'checkbox',
  'badge',
  'alert',
  'avatar',
  'separator',
  'skeleton',
  'switch',
  'textarea',
  'table',
  'tabs',
  'image',
  'card',
  'shape-divider',
  'nav-bar',
];

const getEditableBlockType = (type?: string): EditableBlockType => {
  return editableBlockTypes.includes(type as EditableBlockType)
    ? (type as EditableBlockType)
    : 'text';
};

export default function Editor() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const dispatch = useAppDispatch();
  const canvasBlocks = useAppSelector((state) => state.canvas.blocks);
  const viewMode = useAppSelector((state) => state.canvas.viewMode);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    const getDBPageData = async () => {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const pageName = urlParams.get('pagename') || 'default';
      console.log('Current pageName:', pageName); // Log current page name

      const persistKey = `persist:root-${pageName}`;
      const existing = safeStorageGet(persistKey);
      console.log('Persisted data found:', !!existing); // Log if persisted data exists

      try {
        const response = await fetch(
          `${backendUrl}/api/pages/get-page?name=${pageName}&key=allowMe`,
          {
            cache: 'no-store',
            credentials: 'include',
          }
        );
        if (!response.ok) {
          console.error('Failed to fetch page data');
          return;
        }

        const data = await response.json();
        console.log('Fetched page data:', data); // Log fetched data

        const headerBlocks = data?.header?.component || [];
        const footerBlocks = data?.footer?.component || [];
        console.log('Extracted headerBlocks:', headerBlocks); // Log extracted header blocks
        console.log('Extracted footerBlocks:', footerBlocks); // Log extracted footer blocks


        if (existing) {
          // If already persisted, just update the layout blocks (header/footer)
          // so the user sees the latest global layout parts
          dispatch(setLayoutBlocks({ headerBlocks, footerBlocks }));
          // Removed 'return;' here to allow fetching and setting main blocks
        }

        const blocks = data?.page?.component || [];
        console.log('Blocks from fetched data (if no existing data):', blocks); // Log blocks if no existing data


        const newCanvasState = {
          blocks,
          headerBlocks,
          footerBlocks,
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

    if (blockData?.source === 'canvas-block') {
      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId !== overId) {
        dispatch(moveBlock({ activeId, overId }));
      }

      return;
    }

    if (blockData?.source === 'existing-block') {
      if (overData?.type === 'column' && overData.blockId !== blockData.blockId) {
        dispatch(
          moveBlockToColumn({
            activeId: String(active.id),
            targetBlockId: overData.blockId || '',
            columnIndex: overData.columnIndex || 0,
          })
        );
      }

      return;
    }

    if (blockData?.source === 'row-column') {
      if (overData?.type === 'column' && blockData.rowBlockId && overData.blockId) {
        dispatch(
          moveRowColumn({
            sourceRowBlockId: blockData.rowBlockId,
            sourceColumnIndex: blockData.columnIndex || 0,
            targetRowBlockId: overData.blockId,
            targetColumnIndex: overData.columnIndex || 0,
          })
        );
      }

      return;
    }

    if (over.id === 'canvas') {
      console.log('Adding new block to canvas root');

      const newBlock = {
        content: blockData?.content || '',
        type: getEditableBlockType(blockData?.type),
        icon:
          blockData?.type === 'icon'
            ? blockData?.content || 'sparkles'
            : typeof blockData?.icon === 'string'
              ? blockData.icon
              : undefined,
        uniqueId: uuidv4(),
        style: typeof blockData?.style === 'object' ? blockData.style : undefined,
        // Add children for container blocks
        ...(blockData?.type === 'column' || blockData?.type === 'row'
          ? {
              children:
                blockData.id === '1-column'
                  ? [[]]
                  : blockData.id === '2-column'
                    ? [[], []]
                    : blockData.id === '3-column'
                      ? [[], [], []]
                      : blockData.id === 'row'
                        ? [[], []]
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
        icon:
          activeData?.type === 'icon'
            ? activeData?.content || 'sparkles'
            : typeof activeData?.icon === 'string'
              ? activeData.icon
              : undefined,
        content: activeData?.content || '',
        type: getEditableBlockType(activeData?.type),
        style: typeof activeData?.style === 'object' ? activeData.style : undefined,
        uniqueId: uuidv4(),
        // Add children for column blocks
        ...(activeData?.type === 'column' || activeData?.type === 'row'
          ? {
              children:
                activeData.id === '1-column'
                  ? [[]]
                  : activeData.id === '2-column'
                    ? [[], []]
                    : activeData.id === '3-column'
                      ? [[], [], []]
                      : activeData.id === 'row'
                        ? [[], []]
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

