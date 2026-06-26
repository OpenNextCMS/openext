'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
} from '@dnd-kit/core';
import Link from 'next/link';
import { Eye, LayoutTemplate } from 'lucide-react';
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
import CenterPanel from './CenterPanel';
import AutoConnectModal from './AutoConnectModal';
import RightPanel from './RightPanel';

export default function MenuRedirectApp() {
  const dispatch = useAppDispatch();
  const activeHeaderId = useAppSelector((s) => s.menuRedirect.activeHeaderId);
  const { canEdit, role } = useCanEditMappings();
  const [autoOpen, setAutoOpen] = useState(false);
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

  const onDragEnd = (event: DragEndEvent) => {
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
          <h1 className="text-lg font-bold">Menu Redirect</h1>
          <p className="text-xs text-muted-foreground">
            Drag a target onto a menu item to link it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/plugins/menu-redirect/editor"
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <LayoutTemplate className="h-3.5 w-3.5" /> Visual Editor
          </Link>
          {!canEdit ? (
            <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
              <Eye className="h-3 w-3" /> Read-only ({role})
            </span>
          ) : null}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
        <div className="grid flex-1 grid-cols-[280px_1fr_340px] overflow-hidden">
          <LeftPanel canEdit={canEdit} />
          <CenterPanel canEdit={canEdit} onAutoConnect={() => setAutoOpen(true)} />
          <RightPanel canEdit={canEdit} />
        </div>
      </DndContext>

      <AutoConnectModal open={autoOpen} onClose={() => setAutoOpen(false)} />
    </div>
  );
}
