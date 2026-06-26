'use client';

import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LayoutTemplate } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  selectOrderedFields,
  selectBuilder,
  removeField,
  duplicateField,
  setSelectedField,
  setActiveStep,
} from '@/redux/formBuilderSlice';
import { SortableField } from './SortableField';

/** Canvas drop target id, recognized by FormBuilder.onDragEnd. */
export const CANVAS_DROPPABLE_ID = 'form-canvas';

export function FormCanvas() {
  const dispatch = useAppDispatch();
  const fields = useAppSelector(selectOrderedFields);
  const { selectedFieldId, form, activeStep } = useAppSelector(selectBuilder);
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });

  const multiStep = form?.settings?.multiStep?.enabled;
  const steps = useMemo(() => {
    if (!multiStep) return [1];
    const set = new Set<number>();
    fields.forEach((f) => set.add(f.step ?? 1));
    set.add(1);
    return Array.from(set).sort((a, b) => a - b);
  }, [multiStep, fields]);

  const visibleFields = multiStep ? fields.filter((f) => (f.step ?? 1) === activeStep) : fields;

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {multiStep ? (
        <div className="flex gap-1 border-b bg-background p-2">
          {steps.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => dispatch(setActiveStep(s))}
              className={`rounded-md px-3 py-1 text-sm ${
                activeStep === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              Step {s}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-6">
        <div
          ref={setNodeRef}
          className={`mx-auto max-w-2xl space-y-3 rounded-xl border-2 border-dashed p-4 transition-colors ${
            isOver ? 'border-primary bg-primary/5' : 'border-transparent'
          }`}
        >
          {visibleFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              <LayoutTemplate className="mb-3 h-8 w-8" />
              <p className="font-medium">Drag fields here</p>
              <p className="text-sm">Drop a field from the left, or click one to add it.</p>
            </div>
          ) : (
            <SortableContext items={visibleFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {visibleFields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  selected={selectedFieldId === field.id}
                  onSelect={() => dispatch(setSelectedField(field.id))}
                  onDuplicate={() => dispatch(duplicateField(field.id))}
                  onDelete={() => dispatch(removeField(field.id))}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
}
