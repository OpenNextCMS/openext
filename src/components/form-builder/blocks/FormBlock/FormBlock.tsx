'use client';

import React, { useEffect, useState } from 'react';
import { FileInput } from 'lucide-react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import type { Block } from '@/types/index';
import { formApi } from '@/components/form-builder/api';
import { FieldPreview } from '@/components/form-builder/builder/FieldPreview';
import type { IForm } from '@/types/form-builder';
import { parseFormBlock, type FormBlockProps } from './block.config';

/** Editor view: pick a published form, set title/description, preview fields. */
export function FormBlockEditor({ block }: { block: Block }) {
  const dispatch = useAppDispatch();
  const props = parseFormBlock(block.content);
  const [forms, setForms] = useState<Pick<IForm, '_id' | 'name'>[]>([]);
  const [selected, setSelected] = useState<IForm | null>(null);

  const update = (patch: Partial<FormBlockProps>) => {
    const next = { ...props, ...patch };
    dispatch(updateBlockContent({ id: block.uniqueId ?? block.id ?? '', content: JSON.stringify(next) }));
  };

  useEffect(() => {
    formApi
      .list({ status: 'published', limit: 100 })
      .then((r) => setForms(r.data.map((f) => ({ _id: f._id, name: f.name }))))
      .catch(() => setForms([]));
  }, []);

  useEffect(() => {
    if (!props.formId) {
      setSelected(null);
      return;
    }
    formApi.get(props.formId).then(setSelected).catch(() => setSelected(null));
  }, [props.formId]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FileInput className="h-4 w-4" /> Form block
      </div>

      <label className="mb-1 block text-xs font-medium">Select form</label>
      <select
        className="mb-3 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={props.formId}
        onChange={(e) => update({ formId: e.target.value })}
      >
        <option value="">— Choose a published form —</option>
        {forms.map((f) => (
          <option key={f._id} value={f._id}>
            {f.name}
          </option>
        ))}
      </select>

      <div className="mb-3 flex items-center gap-2">
        <input
          id={`show-title-${block.uniqueId}`}
          type="checkbox"
          checked={props.showTitle}
          onChange={(e) => update({ showTitle: e.target.checked })}
        />
        <label htmlFor={`show-title-${block.uniqueId}`} className="text-xs">
          Show title &amp; description
        </label>
      </div>

      <input
        className="mb-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        placeholder="Title (optional)"
        value={props.title}
        onChange={(e) => update({ title: e.target.value })}
      />
      <input
        className="mb-3 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        placeholder="Description (optional)"
        value={props.description}
        onChange={(e) => update({ description: e.target.value })}
      />

      {/* Non-interactive preview of the selected form's fields. */}
      {selected ? (
        <div className="space-y-2 rounded-md border bg-background p-3">
          {props.showTitle && props.title ? <h3 className="text-lg font-semibold">{props.title}</h3> : null}
          {selected.fields.slice(0, 6).map((f) => (
            <FieldPreview key={f.id} field={f} />
          ))}
          {selected.fields.length > 6 ? (
            <p className="text-xs text-muted-foreground">+{selected.fields.length - 6} more fields</p>
          ) : null}
        </div>
      ) : props.formId ? (
        <p className="text-xs text-muted-foreground">Loading preview…</p>
      ) : (
        <p className="text-xs text-muted-foreground">Pick a form to preview it here.</p>
      )}
    </div>
  );
}
