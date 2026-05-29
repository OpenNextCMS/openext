'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MenuRedirectAction } from '@/types/menu-redirect';

interface Entry {
  _id: string;
  action: MenuRedirectAction;
  menuItemId?: string;
  oldValue?: { targetUrl?: string; targetType?: string } | null;
  newValue?: { targetUrl?: string; targetType?: string } | null;
  createdAt: string;
}

const BADGE: Record<string, string> = {
  'plugin-installed': 'bg-blue-100 text-blue-700',
  'plugin-enabled': 'bg-green-100 text-green-700',
  'plugin-disabled': 'bg-orange-100 text-orange-700',
  'plugin-uninstalled': 'bg-red-100 text-red-700',
  'mapping-created': 'bg-green-100 text-green-700',
  'mapping-updated': 'bg-amber-100 text-amber-700',
  'mapping-deleted': 'bg-red-100 text-red-700',
  'bulk-auto-match': 'bg-purple-100 text-purple-700',
};

export default function HistoryView() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [menuItemId, setMenuItemId] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  // Track the latest mapping entry per menuItemId to expose Undo only there.
  const latestRef = useRef<Set<string>>(new Set());

  const load = useCallback(
    async (opts: { reset: boolean }) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ limit: '25' });
        if (menuItemId.trim()) qs.set('menuItemId', menuItemId.trim());
        if (!opts.reset && cursor) qs.set('cursor', cursor);
        const res = await fetch(`/api/menu-redirect/history?${qs.toString()}`);
        const json = await res.json();
        const data: Entry[] = json?.data ?? [];
        setHasMore(!!json?.meta?.hasMore);
        setCursor(json?.meta?.nextCursor ?? null);
        setEntries((prev) => (opts.reset ? data : [...prev, ...data]));
      } catch {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    },
    [menuItemId, cursor]
  );

  useEffect(() => {
    const t = setTimeout(() => load({ reset: true }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItemId]);

  // Compute which entries are the most-recent mapping change for their item.
  latestRef.current = new Set();
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.menuItemId && String(e.action).startsWith('mapping-') && !seen.has(e.menuItemId)) {
      seen.add(e.menuItemId);
      latestRef.current.add(e._id);
    }
  }

  const undo = async (id: string) => {
    try {
      const res = await fetch('/api/menu-redirect/history/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ historyId: id }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || 'Undo failed');
      }
      toast.success('Change undone');
      load({ reset: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu Redirect — History</h1>
      </div>
      <Input
        placeholder="Filter by menu item id (e.g. about-1)…"
        value={menuItemId}
        onChange={(e) => setMenuItemId(e.target.value)}
        className="max-w-sm"
      />

      <ol className="space-y-2">
        {entries.map((e) => (
          <li key={e._id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge className={`${BADGE[e.action] ?? 'bg-muted'} border-none`}>{e.action}</Badge>
                {e.menuItemId ? (
                  <span className="text-xs font-mono text-muted-foreground">{e.menuItemId}</span>
                ) : null}
              </div>
              {e.oldValue || e.newValue ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {e.oldValue?.targetUrl || '—'} → {e.newValue?.targetUrl || '—'}
                </p>
              ) : null}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </p>
            </div>
            {latestRef.current.has(e._id) ? (
              <Button variant="outline" size="sm" onClick={() => undo(e._id)}>
                <Undo2 className="mr-1 h-3 w-3" /> Undo
              </Button>
            ) : null}
          </li>
        ))}
      </ol>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {hasMore && !loading ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load({ reset: false })}>
            Load more
          </Button>
        </div>
      ) : null}

      {!loading && entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No history yet.</p>
      ) : null}
    </div>
  );
}
