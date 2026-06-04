'use client';

import { useEffect, useState } from 'react';
import { menuItemIdFor } from '@/lib/menu-redirect/menu-item-id';

export interface MenuDirective {
  mappingId: string;
  href: string;
  openInNewTab: boolean;
  nofollow: boolean;
  enabled: boolean;
  customClass?: string;
  dataAttributes?: Record<string, string>;
  trackClicks: boolean;
}

/**
 * Runtime hook for the published navbar. Fetches per-menuItemId redirect
 * directives for a header. When the plugin is inactive (active=false), callers
 * leave links untouched — the header keeps working with its default hrefs.
 */
export function useMergedMenu(headerId?: string) {
  const [active, setActive] = useState(false);
  const [directives, setDirectives] = useState<Record<string, MenuDirective>>({});

  useEffect(() => {
    const qs = headerId ? `?headerId=${encodeURIComponent(headerId)}` : '';
    let alive = true;
    fetch(`/api/menu-redirect/public/merged${qs}`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        const d = res?.data;
        if (d) {
          setActive(!!d.active);
          setDirectives((d.directives as Record<string, MenuDirective>) || {});
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [headerId]);

  /** Directive for a link by its (label, index) — null when inactive/unmapped. */
  const getFor = (label: string, index: number, parentId?: string): MenuDirective | null => {
    if (!active) return null;
    return directives[menuItemIdFor(label, index, parentId)] ?? null;
  };

  return { active, getFor };
}
