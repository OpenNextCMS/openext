'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import {
  Save,
  Eye,
  Send,
  History,
  Settings2,
  Loader2,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  setForm,
  addField,
  reorderFields,
  setSaving,
  markSaved,
  selectBuilder,
  selectComposedForm,
  selectOrderedFields,
} from '@/redux/formBuilderSlice';
import { formApi } from '@/components/form-builder/api';
import { createField } from '@/components/form-builder/fields/library';
import type { FormFieldTypeValue, IFormVersion } from '@/types/form-builder';
import { FormStatus } from '@/types/form-builder';
import { FieldLibrary, LIB_PREFIX } from './FieldLibrary';
import { FormCanvas, CANVAS_DROPPABLE_ID } from './FormCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { FormSettingsDrawer } from './FormSettingsDrawer';

const AUTOSAVE_DEBOUNCE_MS = 1500;

export default function FormBuilder({ formId }: { formId: string }) {
  const dispatch = useAppDispatch();
  const { form, isSaving, dirty, lastSavedAt } = useAppSelector(selectBuilder);
  const fields = useAppSelector(selectOrderedFields);
  const composed = useAppSelector(selectComposedForm);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<IFormVersion[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load the form once.
  useEffect(() => {
    let active = true;
    formApi
      .get(formId)
      .then((f) => {
        if (active) {
          dispatch(setForm(f));
          setLoading(false);
        }
      })
      .catch((e) => {
        toast.error((e as Error).message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [formId, dispatch]);

  const persist = useCallback(async () => {
    if (!composed) return;
    dispatch(setSaving(true));
    try {
      await formApi.update(formId, {
        name: composed.name,
        slug: composed.slug,
        description: composed.description,
        fields: composed.fields,
        settings: composed.settings,
      });
      dispatch(markSaved());
    } catch (e) {
      dispatch(setSaving(false));
      toast.error((e as Error).message);
    }
  }, [composed, dispatch, formId]);

  // Debounced autosave whenever the form becomes dirty.
  useEffect(() => {
    if (!dirty || loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, loading, persist]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // New field dragged from the library.
    if (activeId.startsWith(LIB_PREFIX)) {
      const type = activeId.slice(LIB_PREFIX.length) as FormFieldTypeValue;
      const overIndex = fields.findIndex((f) => f.id === overId);
      const index = overId === CANVAS_DROPPABLE_ID || overIndex < 0 ? fields.length : overIndex;
      dispatch(addField({ field: createField(type, index), index }));
      return;
    }

    // Reorder existing fields.
    if (activeId !== overId) {
      const oldIndex = fields.findIndex((f) => f.id === activeId);
      const newIndex = fields.findIndex((f) => f.id === overId);
      if (oldIndex >= 0 && newIndex >= 0) {
        const next = arrayMove(fields, oldIndex, newIndex).map((f) => f.id);
        dispatch(reorderFields(next));
      }
    }
  };

  const publish = async () => {
    try {
      await persist();
      await formApi.update(formId, { status: FormStatus.Published });
      toast.success('Form published');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openVersions = async () => {
    try {
      const list = await formApi.versions(formId);
      setVersions(list);
      setVersionsOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const restore = async (versionId: string) => {
    try {
      const restored = await formApi.restoreVersion(formId, versionId);
      dispatch(setForm(restored));
      setVersionsOpen(false);
      toast.success('Version restored');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading builder…
      </div>
    );
  }

  if (!form) {
    return <div className="p-6 text-muted-foreground">Form not found.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-background px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </span>
          ) : dirty ? (
            <span>Unsaved changes</span>
          ) : lastSavedAt ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="mr-1 h-4 w-4" /> Settings
          </Button>
          <Button variant="outline" size="sm" onClick={openVersions}>
            <History className="mr-1 h-4 w-4" /> History
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/forms/${form.slug}`} target="_blank" rel="noreferrer">
              <Eye className="mr-1 h-4 w-4" /> Preview
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={persist} disabled={isSaving}>
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
          <Button size="sm" onClick={publish}>
            <Send className="mr-1 h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      {/* 3-column builder */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid flex-1 grid-cols-[260px_1fr_320px] overflow-hidden">
          <FieldLibrary onAdd={(type) => dispatch(addField({ field: createField(type, fields.length) }))} />
          <FormCanvas />
          <PropertiesPanel />
        </div>
      </DndContext>

      <FormSettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
          </DialogHeader>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous versions yet.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li key={v._id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>
                    v{v.version}
                    {v.createdAt ? (
                      <span className="ml-2 text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString()}
                      </span>
                    ) : null}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => v._id && restore(v._id)}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
