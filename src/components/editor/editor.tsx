'use client';
import { apiUrl } from '@/lib/apiClient';

import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import LeftSidebar from './left-sidebar';
import RightSidebar from './right-sidebar';
import Blocks from './blocks';
import Canvas from './canvas';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Toolbar from './toolbar';
import StatusBar from './status-bar';
import { Suspense } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  addBlockToSliderSlide,
  moveRowColumn,
  placeBlockAt,
  setCanvasState,
  setBlocks,
  setLayoutBlocks,
  type BlockData as CanvasBlockData,
} from '@/redux/canvasSlice';
import { BlockDragData, Block } from '@/types/index';
import { ROOT_CONTAINER } from '@/utils/blockContainers';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from '@/utils/safeStorage';
import { pluginRegistry } from '@/lib/pluginRegistry';
import { normalizeBlocksForEditor } from '@/lib/editor/normalizePageBlocks';

// Resizable sidebar constraints (in pixels)
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 256;
const LEFT_SIDEBAR_WIDTH_KEY = 'editor:left-sidebar-width';
const RIGHT_SIDEBAR_WIDTH_KEY = 'editor:right-sidebar-width';

const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

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
  containerId?: string;
  // Injected by dnd-kit's useSortable on every sortable item.
  sortable?: { containerId: string; index: number };
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
  'blog-feed',
  'form-block',
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
  useEffect(() => {
    const getDBPageData = async () => {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const pageName = urlParams.get('pagename') || 'default';
      console.log('Current pageName:', pageName); // Log current page name

      const persistKey = `persist:root-${pageName}`;
      const existing = safeStorageGet(persistKey);

      try {
        const response = await fetch(apiUrl(`/api/pages/get-page?name=${pageName}&key=allowMe`),
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

        const headerBlocks = normalizeBlocksForEditor(data?.header?.component || []);
        const footerBlocks = normalizeBlocksForEditor(data?.footer?.component || []);
        const blocks = normalizeBlocksForEditor(data?.page?.component || []);

        if (existing) {
          dispatch(setLayoutBlocks({ headerBlocks, footerBlocks }));
        }

        safeStorageRemove(persistKey);

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
      } catch (error) {
        console.error('Error fetching canvas data:', error);
      }
    };

    getDBPageData();
  }, [dispatch]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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

  // Builds a fresh block payload from a library drag (no uniqueId yet — the
  // reducer assigns it). Container blocks get their empty column slots.
  const buildNewBlock = (data: BlockDragData) => ({
    content: data?.content || '',
    type: getEditableBlockType(data?.type),
    icon:
      data?.type === 'icon'
        ? data?.content || 'sparkles'
        : typeof data?.icon === 'string'
          ? data.icon
          : undefined,
    style: typeof data?.style === 'object' ? data.style : undefined,
    ...(data?.type === 'column' || data?.type === 'row'
      ? {
          children:
            data.id === '1-column'
              ? [[]]
              : data.id === '2-column'
                ? [[], []]
                : data.id === '3-column'
                  ? [[], [], []]
                  : data.id === 'row'
                    ? [[], []]
                    : [],
        }
      : {}),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = (active.data.current || {}) as BlockDragData & {
      sortable?: { containerId: string; index: number };
    };
    const overData = (over.data.current || {}) as DroppableData;

    // Special case: move an entire row column between rows (unchanged path).
    if (activeData?.source === 'row-column') {
      if (overData?.type === 'column' && activeData.rowBlockId && overData.blockId) {
        dispatch(
          moveRowColumn({
            sourceRowBlockId: activeData.rowBlockId,
            sourceColumnIndex: activeData.columnIndex || 0,
            targetRowBlockId: overData.blockId,
            targetColumnIndex: overData.columnIndex || 0,
          })
        );
      }
      return;
    }

    // Special case: drop into a slider slide (unchanged path).
    if (overData?.type === 'slider-slide' && overData.blockId && overData.slideId) {
      dispatch(
        addBlockToSliderSlide({
          targetBlockId: overData.blockId,
          slideId: overData.slideId,
          newBlock: buildNewBlock(activeData),
        })
      );
      return;
    }

    // Resolve the precise target container + index from the drop target:
    //  - over a sortable sibling -> its container + index (insert before it)
    //  - over an empty zone/canvas -> that container, append (index = null)
    let targetContainerId: string | null = null;
    let targetIndex: number | null = null;

    if (overData?.sortable && typeof overData.sortable.containerId === 'string') {
      targetContainerId = overData.sortable.containerId;
      targetIndex = overData.sortable.index;
    } else if (typeof overData?.containerId === 'string') {
      targetContainerId = overData.containerId;
    } else if (over.id === 'canvas') {
      targetContainerId = ROOT_CONTAINER;
    }

    if (!targetContainerId) return;

    // A sortable `active` is an existing block being moved; anything else is a
    // brand-new block dragged in from the library.
    if (activeData?.sortable) {
      dispatch(
        placeBlockAt({
          targetContainerId,
          targetIndex,
          source: {
            containerId: activeData.sortable.containerId,
            activeId: String(active.id),
          },
        })
      );
    } else {
      dispatch(
        placeBlockAt({
          targetContainerId,
          targetIndex,
          newBlock: buildNewBlock(activeData),
        })
      );
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-300">
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
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
