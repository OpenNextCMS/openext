'use client';

import { useState, useEffect, useCallback } from 'react';
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
  addBlockToSliderSlide,
  moveBlock,
  moveBlockToColumn,
  moveRowColumn,
  setCanvasState,
  setBlocks,
  setLayoutBlocks,
  type BlockData as CanvasBlockData,
} from '@/redux/canvasSlice';
import { BlockDragData, Block } from '@/types/index';
<<<<<<< HEAD
import { safeStorageGet, safeStorageSet } from '@/utils/safeStorage';
import { pluginRegistry } from '@/lib/pluginRegistry';

// Resizable sidebar constraints (in pixels)
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 256;
const LEFT_SIDEBAR_WIDTH_KEY = 'editor:left-sidebar-width';
const RIGHT_SIDEBAR_WIDTH_KEY = 'editor:right-sidebar-width';

const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
=======
import { safeStorageGet } from '@/utils/safeStorage';
import { pluginRegistry } from '@/lib/pluginRegistry';
>>>>>>> khadija

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
  slideId?: string;
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
  'slider',
  'nav-bar',
  'contact',
  'contact-simple',
  'statistics-main',
  'statistics-side-image',
  'statistics-boxed',
  'testimonial-main',
  'testimonial-single',
  'testimonial-single-large',
  'hero-main',
  'hero-centered',
  'content-features',
  'content-gallery',
  'content-icons',
  'content-categories',
  'content-detail',
  'content-split',
  'content-trio',
  'feature-trio',
  'feature-vertical',
  'feature-side-image',
  'feature-horizontal',
  'feature-boxed',
  'feature-zigzag',
  'feature-checklist',
  'feature-list',
  'ecommerce-grid',
  'ecommerce-detail',
  'ecommerce-info',
<<<<<<< HEAD
  'blog-feed',
  'form-block',
=======
>>>>>>> khadija
];

const getEditableBlockType = (type?: string): EditableBlockType => {
  // Allow plugin types
  if (type && pluginRegistry.getExtension(type)) {
    return type as EditableBlockType;
  }

  return editableBlockTypes.includes(type as EditableBlockType)
    ? (type as EditableBlockType)
    : 'text';
};

const hasInvalidOrDuplicateBlockIds = (blocks: Block[], seen = new Set<string>()): boolean => {
  for (const block of blocks) {
    const uniqueId = typeof block.uniqueId === 'string' ? block.uniqueId.trim() : '';
    if (!uniqueId || seen.has(uniqueId)) return true;
    seen.add(uniqueId);

    for (const column of block.children || []) {
      if (hasInvalidOrDuplicateBlockIds(column, seen)) return true;
    }
  }

  return false;
};

export default function Editor() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);
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
          selectedPart: null,
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

<<<<<<< HEAD
  // Restore previously saved sidebar widths
  useEffect(() => {
    const storedLeft = Number(safeStorageGet(LEFT_SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(storedLeft) && storedLeft > 0) {
      setLeftSidebarWidth(clampSidebarWidth(storedLeft));
    }

    const storedRight = Number(safeStorageGet(RIGHT_SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(storedRight) && storedRight > 0) {
      setRightSidebarWidth(clampSidebarWidth(storedRight));
    }
  }, []);

  const startResizing = useCallback(
    (side: 'left' | 'right') => (event: React.MouseEvent) => {
      event.preventDefault();
      setResizingSide(side);
    },
    []
  );

  // Handle drag-to-resize for whichever sidebar is currently active
  useEffect(() => {
    if (!resizingSide) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (resizingSide === 'left') {
        setLeftSidebarWidth(clampSidebarWidth(event.clientX));
      } else {
        setRightSidebarWidth(clampSidebarWidth(window.innerWidth - event.clientX));
      }
    };

    const stopResizing = () => setResizingSide(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [resizingSide]);

  // Persist widths after a resize finishes
  useEffect(() => {
    safeStorageSet(LEFT_SIDEBAR_WIDTH_KEY, String(leftSidebarWidth));
  }, [leftSidebarWidth]);

  useEffect(() => {
    safeStorageSet(RIGHT_SIDEBAR_WIDTH_KEY, String(rightSidebarWidth));
  }, [rightSidebarWidth]);

=======
>>>>>>> khadija
  useEffect(() => {
    if (canvasBlocks.length === 0 || !hasInvalidOrDuplicateBlockIds(canvasBlocks as Block[])) {
      return;
    }

    dispatch(setBlocks(canvasBlocks as CanvasBlockData[]));
  }, [canvasBlocks, dispatch]);

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

    if (overData?.type === 'slider-slide' && overData.blockId && overData.slideId) {
      const activeData = active.data.current as BlockDragData;
      const nestedBlock = {
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

      dispatch(
        addBlockToSliderSlide({
          targetBlockId: overData.blockId,
          slideId: overData.slideId,
          newBlock: nestedBlock,
        })
      );
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
                style={{ left: showLeftSidebar ? leftSidebarWidth : 8 }}
                className={`absolute ${showLeftSidebar ? 'rounded-r-full' : 'rounded-full'} top-3.5 z-10 h-8 w-8 border shadow-md ${resizingSide ? '' : 'transition-all duration-300'} dark:border-border dark:bg-background`}
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
            style={{ width: showLeftSidebar ? leftSidebarWidth : 0 }}
            className={`relative flex-shrink-0 ${showLeftSidebar ? 'border-r border-border' : ''} ${resizingSide ? '' : 'transition-all duration-300'}`}
          >
            <div className={`h-full ${!showLeftSidebar ? 'invisible' : ''}`}>
              <Suspense fallback={<div>Loading Sidebar...</div>}>
                <LeftSidebar />
              </Suspense>
            </div>
            {showLeftSidebar && (
              <div
                role="separator"
                aria-orientation="vertical"
                title="Drag to resize"
                onMouseDown={startResizing('left')}
                className={`absolute right-0 top-0 z-20 h-full w-1.5 -mr-0.5 cursor-col-resize transition-colors hover:bg-primary/40 ${resizingSide === 'left' ? 'bg-primary/60' : 'bg-transparent'}`}
              />
            )}
          </div>

          {isOpen && <Blocks toggleSidebar={toggleSidebar} />}

          <div className="flex flex-1 flex-col overflow-hidden">
            <Toolbar toggleSidebar={toggleSidebar} onViewChange={handleViewChange} />
            <Canvas canvasBlocks={canvasBlocks as Block[]} viewMode={viewMode} />
          </div>

          <div
            style={{ width: showRightSidebar ? rightSidebarWidth : 0 }}
            className={`relative flex-shrink-0 ${showRightSidebar ? 'border-l border-border' : ''} ${resizingSide ? '' : 'transition-all duration-300'}`}
          >
            {showRightSidebar && (
              <div
                role="separator"
                aria-orientation="vertical"
                title="Drag to resize"
                onMouseDown={startResizing('right')}
                className={`absolute left-0 top-0 z-20 h-full w-1.5 -ml-0.5 cursor-col-resize transition-colors hover:bg-primary/40 ${resizingSide === 'right' ? 'bg-primary/60' : 'bg-transparent'}`}
              />
            )}
            <div className={`h-full ${!showRightSidebar ? 'invisible' : ''}`}>
              <RightSidebar />
            </div>
          </div>

          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              style={{ right: showRightSidebar ? rightSidebarWidth : 8 }}
              className={`absolute ${showRightSidebar ? 'rounded-l-full' : 'rounded-full'} top-2.5 z-10 h-8 w-8 border shadow-md ${resizingSide ? '' : 'transition-all duration-300'} dark:border-border dark:bg-background`}
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
