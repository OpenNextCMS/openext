'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Loader2, Save, Plus, Monitor, Tablet, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { LayoutSection, SectionType } from '@/types/index';
import { SECTION_META, SECTION_TYPES, createSection } from './sections';
import SortableSection from './SortableSection';
import { v4 as uuidv4 } from 'uuid';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';
const widths: Record<Breakpoint, string> = {
  desktop: 'max-w-full',
  tablet: 'max-w-3xl',
  mobile: 'max-w-sm',
};

interface LayoutState {
  _id?: string;
  name: string;
  isActive: boolean;
  sections: LayoutSection[];
}

export default function LayoutBuilder() {
  const [layout, setLayout] = useState<LayoutState>({
    name: 'Blog Layout',
    isActive: true,
    sections: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    fetch('/api/layouts')
      .then((r) => r.json())
      .then((res) => {
        const existing = Array.isArray(res?.data) ? res.data[0] : null;
        if (existing) {
          setLayout({
            _id: existing._id,
            name: existing.name,
            isActive: existing.isActive,
            sections: existing.sections ?? [],
          });
        } else {
          // Seed a sensible starter layout (unsaved until "Save").
          setLayout((l) => ({
            ...l,
            sections: ['hero', 'featured-post', 'latest-posts', 'newsletter'].map((t) =>
              createSection(t as SectionType)
            ),
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mutate = (fn: (sections: LayoutSection[]) => LayoutSection[]) => {
    setLayout((l) => ({ ...l, sections: fn(l.sections) }));
    setDirty(true);
  };

  const addSection = (type: SectionType) => mutate((s) => [...s, createSection(type)]);
  const updateSettings = (id: string, settings: Record<string, unknown>) =>
    mutate((s) => s.map((sec) => (sec.id === id ? { ...sec, settings } : sec)));
  const toggleVisible = (id: string) =>
    mutate((s) => s.map((sec) => (sec.id === id ? { ...sec, visible: !sec.visible } : sec)));
  const toggleBreakpointHidden = (id: string) =>
    mutate((s) =>
      s.map((sec) =>
        sec.id === id
          ? {
              ...sec,
              responsive: {
                ...sec.responsive,
                [breakpoint]: {
                  ...sec.responsive[breakpoint],
                  hidden: !sec.responsive[breakpoint]?.hidden,
                },
              },
            }
          : sec
      )
    );
  const duplicate = (id: string) =>
    mutate((s) => {
      const i = s.findIndex((sec) => sec.id === id);
      if (i < 0) return s;
      const copy = { ...s[i], id: uuidv4() };
      return [...s.slice(0, i + 1), copy, ...s.slice(i + 1)];
    });
  const remove = (id: string) => mutate((s) => s.filter((sec) => sec.id !== id));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    mutate((s) => {
      const from = s.findIndex((sec) => sec.id === active.id);
      const to = s.findIndex((sec) => sec.id === over.id);
      return from < 0 || to < 0 ? s : arrayMove(s, from, to);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(layout._id ? `/api/layouts/${layout._id}` : '/api/layouts', {
        method: layout._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: layout.name,
          isActive: layout.isActive,
          sections: layout.sections,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Save failed');
      setLayout((l) => ({ ...l, _id: json.data._id }));
      setDirty(false);
      toast.success('Layout saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4 p-4">
      {/* Left rail */}
      <aside className="w-56 shrink-0 space-y-2 overflow-y-auto">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Sections</h2>
        {SECTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addSection(type)}
            className="flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm hover:bg-muted"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>
              <span className="font-medium">{SECTION_META[type].label}</span>
            </span>
          </button>
        ))}
      </aside>

      {/* Canvas */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map((bp) => {
              const Icon = bp === 'desktop' ? Monitor : bp === 'tablet' ? Tablet : Smartphone;
              return (
                <button
                  key={bp}
                  type="button"
                  onClick={() => setBreakpoint(bp)}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${
                    breakpoint === bp ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {bp}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              Active
              <Switch
                checked={layout.isActive}
                onCheckedChange={(v) => {
                  setLayout((l) => ({ ...l, isActive: v }));
                  setDirty(true);
                }}
              />
            </label>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <div className={`mx-auto w-full ${widths[breakpoint]} flex-1 space-y-3 overflow-y-auto`}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={layout.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {layout.sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  breakpoint={breakpoint}
                  onUpdateSettings={(settings) => updateSettings(section.id, settings)}
                  onToggleVisible={() => toggleVisible(section.id)}
                  onToggleBreakpointHidden={() => toggleBreakpointHidden(section.id)}
                  onDuplicate={() => duplicate(section.id)}
                  onDelete={() => remove(section.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {layout.sections.length === 0 ? (
            <Card className="border-dashed py-12 text-center text-sm text-muted-foreground">
              Add sections from the left to build your blog layout.
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
