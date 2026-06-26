'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Eye } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  loadPluginState,
  loadHeader,
  loadContent,
  loadMappings,
  createMapping,
  setSelectedMenuItemId,
} from '@/redux/menuRedirectSlice';
import type { ContentItem, MenuRedirectMapping } from '@/types/menu-redirect';
import { useCanEditMappings } from './useCanEditMappings';
import LeftPanel from './LeftPanel';
import HeaderCanvas from './HeaderCanvas';
import AutoConnectModal from './AutoConnectModal';
import RightPanel from './RightPanel';

/**
 * Dedicated visual editor for the Menu Redirect plugin. Renders the active
 * header as a simplified, live nav bar (HeaderCanvas) and lets the user drag
 * pages/blogs from the left bar onto its menu items. A drop immediately creates
 * the redirect mapping, which the runtime navbar (NavbarBlock + useMergedMenu)
 * then applies on the published site.
 */
export default function EditorApp() {
  const dispatch = useAppDispatch();
  const activeHeaderId = useAppSelector((s) => s.menuRedirect.activeHeaderId);
  const { canEdit, role } = useCanEditMappings();
  const [autoOpen, setAutoOpen] = useState(false);
  const [dragging, setDragging] = useState<ContentItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Init: sync plugin state into the store, then load header + content.
  useEffect(() => {
    dispatch(loadPluginState()).then(() => {
      dispatch(loadContent());
      dispatch(loadHeader());
    });
  }, [dispatch]);

  // Load mappings once a header is resolved.
  useEffect(() => {
    if (activeHeaderId) dispatch(loadMappings(activeHeaderId));
  }, [activeHeaderId, dispatch]);

  const onDragStart = (event: DragStartEvent) => {
    setDragging((event.active.data.current as ContentItem | undefined) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    if (!canEdit) return;
    const { over, active } = event;
    if (!over) return;
    const menuItemId = String(over.id);
    const content = active.data.current as ContentItem | undefined;
    if (!content || !activeHeaderId) return;

    const mapping: MenuRedirectMapping = {
      headerId: activeHeaderId,
      menuItemId,
      targetType: content.targetType,
      targetId: content.targetId,
      targetSlug: content.slug,
      targetUrl: content.targetUrl,
      openInNewTab: false,
      nofollow: false,
      trackClicks: false,
      enabled: true,
    };
    dispatch(createMapping(mapping));
    dispatch(setSelectedMenuItemId(menuItemId));
  };

  return (
    <div className="flex h-[calc(100vh-1rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-bold">Menu Redirect — Visual Editor</h1>
          <p className="text-xs text-muted-foreground">
            Drag a page or blog onto a menu item in the header to set its redirect.
          </p>
        </div>
        {!canEdit ? (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
            <Eye className="h-3 w-3" /> Read-only ({role})
          </span>
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid flex-1 grid-cols-[280px_1fr_340px] overflow-hidden">
          <LeftPanel canEdit={canEdit} />
          <HeaderCanvas canEdit={canEdit} onAutoConnect={() => setAutoOpen(true)} />
          <RightPanel canEdit={canEdit} />
        </div>

        <DragOverlay>
          {dragging ? (
            <div className="rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-lg">
              {dragging.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AutoConnectModal open={autoOpen} onClose={() => setAutoOpen(false)} />
    </div>
  );
}
