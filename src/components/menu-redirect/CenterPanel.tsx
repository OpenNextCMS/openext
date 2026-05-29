'use client';

import { useDroppable } from '@dnd-kit/core';
import { Link2, X, Wand2, PanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setSelectedMenuItemId, deleteMapping } from '@/redux/menuRedirectSlice';
import type { MenuItem, MenuRedirectMapping } from '@/types/menu-redirect';

function MenuItemRow({
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

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
        selected ? 'border-primary ring-1 ring-primary' : ''
      } ${isOver ? 'border-primary bg-primary/5' : ''}`}
    >
      <div className="min-w-0">
        <p className="font-medium">{item.label}</p>
        {mapping ? (
          <p className="flex items-center gap-1 truncate text-xs text-primary">
            <Link2 className="h-3 w-3" />
            <span className="truncate">{mapping.targetUrl || mapping.targetSlug || mapping.targetType}</span>
            {!mapping.enabled ? <span className="text-orange-500">(disabled)</span> : null}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Not linked — drag a target here</p>
        )}
      </div>
      {mapping && canEdit ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
          aria-label="Unlink"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export default function CenterPanel({
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
        <p className="text-sm">Add a global header with a nav-bar block, then reopen this panel.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Header</p>
          <p className="font-semibold">{headerName}</p>
        </div>
        {onAutoConnect && canEdit ? (
          <Button size="sm" variant="outline" onClick={onAutoConnect}>
            <Wand2 className="mr-2 h-4 w-4" /> Auto Connect
          </Button>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {menuItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            This header has no menu items.
          </p>
        ) : (
          menuItems.map((item) => (
            <MenuItemRow
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
      </div>
    </div>
  );
}
