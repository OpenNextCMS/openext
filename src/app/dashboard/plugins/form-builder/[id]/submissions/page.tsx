'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormBuilderGate } from '@/components/form-builder/FormBuilderGate';
import { formApi } from '@/components/form-builder/api';
import type { ISubmission } from '@/types/form-builder';

const PAGE_SIZE = 20;

function toCsv(rows: ISubmission[]): string {
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r.submissionData || {}).forEach((k) => keys.add(k)));
  const cols = ['createdAt', 'sourcePage', 'ipAddress', ...keys];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = cols.map(escape).join(',');
  const lines = rows.map((r) =>
    cols
      .map((c) =>
        c === 'createdAt' || c === 'sourcePage' || c === 'ipAddress'
          ? escape((r as unknown as Record<string, unknown>)[c])
          : escape(r.submissionData?.[c])
      )
      .join(',')
  );
  return [header, ...lines].join('\n');
}

function Submissions() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [rows, setRows] = useState<ISubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ISubmission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await formApi.submissions(id, { page, limit: PAGE_SIZE });
      setRows(data);
      setTotal(meta?.total ?? data.length);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Submissions</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No submissions yet.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">IP</th>
                  <th className="p-3">Preview</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r._id}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                    onClick={() => setActive(r)}
                  >
                    <td className="p-3">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                    <td className="max-w-[200px] truncate p-3 text-muted-foreground">{r.sourcePage || '—'}</td>
                    <td className="p-3 text-muted-foreground">{r.ipAddress || '—'}</td>
                    <td className="max-w-[280px] truncate p-3">
                      {Object.values(r.submissionData || {})
                        .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
                        .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission detail</DialogTitle>
          </DialogHeader>
          {active ? (
            <dl className="space-y-2 text-sm">
              {Object.entries(active.submissionData || {}).map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 border-b pb-2">
                  <dt className="font-medium text-muted-foreground">{k}</dt>
                  <dd className="col-span-2 break-words">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </dd>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 pt-1 text-muted-foreground">
                <dt className="font-medium">Submitted</dt>
                <dd className="col-span-2">{active.createdAt ? new Date(active.createdAt).toLocaleString() : '—'}</dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <FormBuilderGate>
      <Submissions />
    </FormBuilderGate>
  );
}
