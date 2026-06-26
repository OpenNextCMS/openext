'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { bulkAutoMatch } from '@/redux/menuRedirectSlice';
import { autoMatch } from '@/lib/menu-redirect/matcher';
import type { MenuRedirectMapping } from '@/types/menu-redirect';

interface Row {
  menuItemId: string;
  label: string;
  suggestionLabel: string;
  confidence: number;
  conflict: boolean;
  include: boolean;
  build: () => MenuRedirectMapping & { overwrite?: boolean };
}

export default function AutoConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { menuItems, mappings, contentLists, activeHeaderId } = useAppSelector(
    (s) => s.menuRedirect
  );
  const [rows, setRows] = useState<Row[]>([]);

  const suggestions = useMemo(
    () =>
      autoMatch(menuItems, {
        pages: contentLists.pages,
        blogs: contentLists.blogs,
        categories: contentLists['blog-categories'],
      }),
    [menuItems, contentLists]
  );

  useEffect(() => {
    if (!open || !activeHeaderId) return;
    const next: Row[] = suggestions
      .filter((s) => s.suggestion)
      .map((s) => {
        const conflict = !!mappings[s.menuItem.id];
        const sug = s.suggestion!;
        return {
          menuItemId: s.menuItem.id,
          label: s.menuItem.label,
          suggestionLabel: sug.label,
          confidence: s.confidence,
          conflict,
          include: !conflict && s.confidence >= 0.5,
          build: () => ({
            headerId: activeHeaderId,
            menuItemId: s.menuItem.id,
            targetType: sug.targetType,
            targetId: sug.targetId,
            targetSlug: sug.slug,
            targetUrl: sug.targetUrl,
            openInNewTab: false,
            nofollow: false,
            trackClicks: false,
            enabled: true,
            overwrite: conflict,
          }),
        };
      });
    setRows(next);
  }, [open, activeHeaderId, suggestions, mappings]);

  const toggle = (i: number) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, include: !r.include } : r)));

  const confirm = async () => {
    const chosen = rows.filter((r) => r.include).map((r) => r.build());
    if (chosen.length) await dispatch(bulkAutoMatch(chosen));
    onClose();
  };

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto Connect Menu Items</DialogTitle>
          <DialogDescription>
            Review suggested links below. Existing mappings are flagged as conflicts and excluded by
            default.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No confident matches found.
            </p>
          ) : (
            rows.map((r, i) => (
              <label
                key={r.menuItemId}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
              >
                <input type="checkbox" checked={r.include} onChange={() => toggle(i)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.label} → <span className="text-primary">{r.suggestionLabel}</span>
                  </p>
                  {r.conflict ? (
                    <p className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" /> Overwrites an existing mapping
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                  {Math.round(r.confidence * 100)}%
                </span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={includedCount === 0}>
            Connect {includedCount} item{includedCount === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
