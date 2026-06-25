'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash2, Eye, EyeOff, Settings2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LayoutSection } from '@/types/index';
import { SECTION_META } from './sections';
import { SectionRenderer } from './renderers';
import { settingsRegistry } from './settings';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

interface Props {
  section: LayoutSection;
  breakpoint: Breakpoint;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  onToggleVisible: () => void;
  onToggleBreakpointHidden: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function SortableSection({
  section,
  breakpoint,
  onUpdateSettings,
  onToggleVisible,
  onToggleBreakpointHidden,
  onDuplicate,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  const Panel = settingsRegistry[section.type];
  const meta = SECTION_META[section.type];
  const bpHidden = !!section.responsive?.[breakpoint]?.hidden;

  return (
    <div ref={setNodeRef} style={style} className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{meta?.label ?? section.type}</span>
          {!section.visible ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">hidden</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={`Hide on ${breakpoint}`}
            onClick={onToggleBreakpointHidden}
          >
            {bpHidden ? <EyeOff className="h-4 w-4 text-orange-500" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleVisible} title="Show/hide everywhere">
            {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen((o) => !o)}>
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 border-b bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">{meta?.description}</p>
          {Panel ? <Panel settings={section.settings} onChange={onUpdateSettings} /> : null}
          <label className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={bpHidden} onChange={onToggleBreakpointHidden} />
            Hide this section on {breakpoint}
          </label>
        </div>
      ) : null}

      {/* Live preview */}
      <div className="pointer-events-none max-h-72 origin-top scale-[0.85] overflow-hidden">
        <button type="button" className="flex w-full items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground">
          <ChevronDown className="h-3 w-3" /> preview
        </button>
        <SectionRenderer section={section} />
      </div>
    </div>
  );
}
