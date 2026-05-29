'use client';

import { useDroppable } from '@dnd-kit/core';
import { Link2, X, Wand2, PanelTop, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setSelectedMenuItemId, deleteMapping } from '@/redux/menuRedirectSlice';
import type { MenuItem, MenuRedirectMapping } from '@/types/menu-redirect';

/**
 * A single rendered menu link in the simplified header preview. It is a drop
 * target: dropping a page/blog card onto it links that target (see EditorApp's
 * onDragEnd → createMapping). When linked, it shows the redirect destination.
 */
function NavLinkDrop({
  item,
  mapping,
  selected,
  canEdit,
  onSelect,
  onUnlink,
}: {
  item: MenuItem;
  mapping?: MenuRedirectMapping;
  selected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onUnlink: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: item.id, data: { menuItemId: item.id } });
  const linked = !!mapping;
  const dest = mapping?.targetUrl || mapping?.targetSlug || mapping?.targetType;

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      title={linked ? `Redirects to ${dest}` : 'Drop a page or blog here to set a redirect'}
      className={[
        'group relative flex cursor-pointer flex-col items-center gap-0.5 rounded-md px-3 py-2 text-sm transition-colors',
        selected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
        isOver ? 'bg-primary/15 ring-2 ring-primary ring-offset-1' : '',
        linked ? 'text-primary' : 'text-foreground',
      ].join(' ')}
    >
      <span className="flex items-center gap-1 font-medium">
        {linked ? <Link2 className="h-3.5 w-3.5" /> : null}
        {item.label}
      </span>

      {linked ? (
        <span className="flex max-w-[160px] items-center gap-1 truncate text-[10px] text-muted-foreground">
          <span className="truncate">{dest}</span>
          {!mapping?.enabled ? <span className="text-orange-500">(off)</span> : null}
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground/70">drop target →</span>
      )}

      {linked && canEdit ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
          className="absolute -right-1 -top-1 hidden rounded-full bg-background p-0.5 text-muted-foreground shadow-sm ring-1 ring-border hover:text-destructive group-hover:block"
          aria-label="Unlink"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Simplified, live preview of the active header. Renders the header's real menu
 * items inside a browser-chrome frame; each item is a drop zone for the left-bar
 * pages/blogs. Reuses the Redux store populated by EditorApp.
 */
export default function HeaderCanvas({
  canEdit,
  onAutoConnect,
}: {
  canEdit: boolean;
  onAutoConnect?: () => void;
}) {
  const dispatch = useAppDispatch();
  const { activeHeaderId, headerName, menuItems, mappings, selectedMenuItemId } = useAppSelector(
    (s) => s.menuRedirect
  );

  if (!activeHeaderId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <PanelTop className="mb-3 h-8 w-8" />
        <p className="font-medium">No header detected</p>
        <p className="text-sm">Add a global header with a nav-bar block, then reopen this editor.</p>
      </div>
    );
  }

  const linkedCount = menuItems.filter((i) => mappings[i.id]).length;

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-background p-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Active header</p>
          <p className="font-semibold">{headerName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {linkedCount}/{menuItems.length} linked
          </span>
          {onAutoConnect && canEdit ? (
            <Button size="sm" variant="outline" onClick={onAutoConnect}>
              <Wand2 className="mr-2 h-4 w-4" /> Auto Connect
            </Button>
          ) : null}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto p-6">
        <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MousePointerClick className="h-3.5 w-3.5" />
          Drag a page or blog from the left onto a menu item to set its redirect.
        </p>

        {/* Browser-chrome frame around the simplified header */}
        <div className="w-full max-w-3xl overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>

          {/* Simplified nav bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-4">
            <span className="mr-4 font-bold tracking-tight">{headerName}</span>
            <nav className="flex flex-1 flex-wrap items-center justify-end gap-1">
              {menuItems.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  This header has no menu items.
                </p>
              ) : (
                menuItems.map((item) => (
                  <NavLinkDrop
                    key={item.id}
                    item={item}
                    mapping={mappings[item.id]}
                    selected={selectedMenuItemId === item.id}
                    canEdit={canEdit}
                    onSelect={() => dispatch(setSelectedMenuItemId(item.id))}
                    onUnlink={() => {
                      const m = mappings[item.id];
                      if (m?._id) dispatch(deleteMapping({ id: m._id, menuItemId: item.id }));
                    }}
                  />
                ))
              )}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
