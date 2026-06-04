'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileInput, Loader2, FilePlus2, AlertCircle } from 'lucide-react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import type { Block } from '@/types/index';
import { formApi } from '@/components/form-builder/api';
import { FieldPreview } from '@/components/form-builder/builder/FieldPreview';
import type { IForm, FormStatusValue } from '@/types/form-builder';
import { parseFormBlock, type FormBlockProps } from './block.config';

type FormOption = { _id: string; name: string; status: FormStatusValue };

/** Editor view: pick a published form, set title/description, preview fields. */
export function FormBlockEditor({ block }: { block: Block }) {
  const dispatch = useAppDispatch();
  const props = parseFormBlock(block.content);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IForm | null>(null);

  const update = (patch: Partial<FormBlockProps>) => {
    const next = { ...props, ...patch };
    dispatch(updateBlockContent({ id: block.uniqueId ?? block.id ?? '', content: JSON.stringify(next) }));
  };

  // Load every form so we can tell "no forms at all" apart from "none published".
  useEffect(() => {
    let active = true;
    formApi
      .list({ limit: 100, sortBy: '-updatedAt' })
      .then((r) => {
        if (!active) return;
        setForms(r.data.map((f) => ({ _id: f._id!, name: f.name, status: f.status })));
      })
      .catch(() => active && setForms([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!props.formId) {
      setSelected(null);
      return;
    }
    formApi.get(props.formId).then(setSelected).catch(() => setSelected(null));
  }, [props.formId]);

  const published = forms.filter((f) => f.status === 'published');

  const Header = (
    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <FileInput className="h-4 w-4" /> Form block
    </div>
  );

  // --- Empty / loading states ------------------------------------------------
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        {Header}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading forms…
        </div>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-6 text-center">
        {Header}
        <AlertCircle className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
        <p className="text-sm font-medium">No forms to use yet</p>
        <p className="mb-3 text-xs text-muted-foreground">
          You haven’t created any forms in the Form Builder. Create one, then come back and add it here.
        </p>
        <Link
          href="/dashboard/plugins/form-builder/new"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <FilePlus2 className="h-3.5 w-3.5" /> Create a form
        </Link>
      </div>
    );
  }

  if (published.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-6 text-center">
        {Header}
        <AlertCircle className="mx-auto mb-2 h-7 w-7 text-amber-500" />
        <p className="text-sm font-medium">No published forms</p>
        <p className="mb-3 text-xs text-muted-foreground">
          You have {forms.length} form{forms.length > 1 ? 's' : ''}, but only{' '}
          <strong>published</strong> forms can be embedded. Publish a form first.
        </p>
        <Link
          href="/dashboard/plugins/form-builder"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          Manage forms
        </Link>
      </div>
    );
  }

  // --- Normal state: choose a published form --------------------------------
  return (
    <div className="rounded-lg border bg-card p-4">
      {Header}

      <label className="mb-1 block text-xs font-medium">Which form do you want to use?</label>
      <select
        className="mb-3 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={props.formId}
        onChange={(e) => update({ formId: e.target.value })}
      >
        <option value="">— Choose a form —</option>
        {published.map((f) => (
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
