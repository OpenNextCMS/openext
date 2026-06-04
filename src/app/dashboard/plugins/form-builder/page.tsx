'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Inbox,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormBuilderGate } from '@/components/form-builder/FormBuilderGate';
import { useFormPermissions } from '@/components/form-builder/useFormPermissions';
import { formApi } from '@/components/form-builder/api';
import type { IForm, FormStatusValue } from '@/types/form-builder';

function statusVariant(s: FormStatusValue): 'default' | 'secondary' | 'outline' {
  return s === 'published' ? 'default' : s === 'archived' ? 'outline' : 'secondary';
}

function FormsList() {
  const perms = useFormPermissions();
  const [forms, setForms] = useState<IForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await formApi.list({ limit: 100, sortBy: '-updatedAt' });
      setForms(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const remove = async (id: string) => {
    if (!confirm('Delete this form and all its submissions?')) return;
    try {
      await formApi.remove(id);
      toast.success('Form deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const archive = async (id: string) => {
    try {
      await formApi.update(id, { status: 'archived' as FormStatusValue });
      toast.success('Form archived');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const duplicate = async (id: string) => {
    try {
      await formApi.duplicate(id);
      toast.success('Form duplicated');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} form(s)?`)) return;
    await Promise.allSettled([...selected].map((id) => formApi.remove(id)));
    setSelected(new Set());
    toast.success('Deleted selected forms');
    load();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Forms</h1>
          <p className="text-sm text-muted-foreground">Build, publish and track forms.</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && perms.canDelete ? (
            <Button variant="destructive" onClick={bulkDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete ({selected.size})
            </Button>
          ) : null}
          {perms.canCreate ? (
            <Button asChild>
              <Link href="/dashboard/plugins/form-builder/new">
                <Plus className="mr-1 h-4 w-4" /> Create form
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading forms…
        </div>
      ) : forms.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p className="font-medium">No forms yet</p>
          <p className="text-sm">Create your first form to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="w-10 p-3"></th>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submissions</th>
                <th className="p-3">Conversion</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(f._id!)}
                      onChange={() => toggleSelect(f._id!)}
                      aria-label={`Select ${f.name}`}
                    />
                  </td>
                  <td className="p-3 font-medium">{f.name}</td>
                  <td className="p-3">
                    <Badge variant={statusVariant(f.status)}>{f.status}</Badge>
                  </td>
                  <td className="p-3">{f.analytics?.completions ?? 0}</td>
                  <td className="p-3">{(f.analytics?.conversionRate ?? 0).toFixed(1)}%</td>
                  <td className="p-3 text-muted-foreground">
                    {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <IconLink href={`/dashboard/plugins/form-builder/${f._id}/edit`} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </IconLink>
                      <IconLink
                        href={`/dashboard/plugins/form-builder/${f._id}/submissions`}
                        title="Submissions"
                      >
                        <Inbox className="h-4 w-4" />
                      </IconLink>
                      <IconLink
                        href={`/dashboard/plugins/form-builder/${f._id}/analytics`}
                        title="Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </IconLink>
                      {perms.canEdit ? (
                        <button className="rounded p-1.5 hover:bg-accent" title="Duplicate" onClick={() => duplicate(f._id!)}>
                          <Copy className="h-4 w-4" />
                        </button>
                      ) : null}
                      {perms.canEdit ? (
                        <button className="rounded p-1.5 hover:bg-accent" title="Archive" onClick={() => archive(f._id!)}>
                          <Archive className="h-4 w-4" />
                        </button>
                      ) : null}
                      {perms.canDelete ? (
                        <button
                          className="rounded p-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          title="Delete"
                          onClick={() => remove(f._id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IconLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link href={href} title={title} className="rounded p-1.5 hover:bg-accent">
      {children}
    </Link>
  );
}

export default function FormsPage() {
  return (
    <FormBuilderGate>
      <FormsList />
    </FormBuilderGate>
  );
}
