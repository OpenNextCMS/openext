'use client';

import React, { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  FIELD_LIBRARY,
  FIELD_CATEGORIES,
  type FieldLibraryItem,
} from '@/components/form-builder/fields/library';

/** Library drag-source prefix, recognized by FormBuilder.onDragEnd. */
export const LIB_PREFIX = 'lib:';

function DraggableCard({ item, onAdd }: { item: FieldLibraryItem; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${LIB_PREFIX}${item.type}`,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onAdd}
      className={`flex w-full items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-left text-sm hover:border-primary hover:bg-accent ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="text-muted-foreground">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export function FieldLibrary({ onAdd }: { onAdd: (type: FieldLibraryItem['type']) => void }) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = q ? FIELD_LIBRARY.filter((f) => f.label.toLowerCase().includes(q)) : FIELD_LIBRARY;
    return FIELD_CATEGORIES.map((cat) => ({
      cat,
      items: items.filter((f) => f.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <aside className="flex h-full flex-col border-r bg-background">
      <div className="border-b p-3">
        <h2 className="mb-2 text-sm font-semibold">Fields</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fields"
            className="pl-8"
            aria-label="Search fields"
          />
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {grouped.map((g) => (
          <div key={g.cat}>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {g.cat}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {g.items.map((item) => (
                <DraggableCard key={item.type} item={item} onAdd={() => onAdd(item.type)} />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fields match “{query}”.</p>
        ) : null}
      </div>
    </aside>
  );
}
