'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Link as LinkIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { loadHeader } from '@/redux/menuRedirectSlice';
import type { HeaderMenuLink } from '@/types/menu-redirect';

type LinkPath = number[];

type LinkTarget = {
  type: 'page' | 'blog';
  label: string;
  slug: string;
  targetId?: string;
};

/** Build the runtime href for a chosen link target. */
function hrefForTarget(target: LinkTarget): string {
  if (target.type === 'blog') return `/blog/${target.slug}`;
  return target.slug === 'home' ? '/' : `/${target.slug}`;
}

const emptyLink = (label = 'New Link', href = '#'): HeaderMenuLink => ({
  label,
  href,
  onClick: 'redirect',
  onClickValue: href,
  children: [],
});

function updateAtPath(
  links: HeaderMenuLink[],
  path: LinkPath,
  updater: (link: HeaderMenuLink) => HeaderMenuLink
): HeaderMenuLink[] {
  const [index, ...rest] = path;
  return links.map((link, currentIndex) => {
    if (currentIndex !== index) return link;
    if (rest.length === 0) return updater(link);
    return {
      ...link,
      children: updateAtPath(link.children || [], rest, updater),
    };
  });
}

function removeAtPath(links: HeaderMenuLink[], path: LinkPath): HeaderMenuLink[] {
  const [index, ...rest] = path;
  if (rest.length === 0) return links.filter((_link, currentIndex) => currentIndex !== index);
  return links.map((link, currentIndex) =>
    currentIndex === index
      ? { ...link, children: removeAtPath(link.children || [], rest) }
      : link
  );
}

function moveAtPath(
  links: HeaderMenuLink[],
  path: LinkPath,
  direction: 'up' | 'down'
): HeaderMenuLink[] {
  const [index, ...rest] = path;

  if (rest.length === 0) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return links;

    const next = [...links];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return next;
  }

  return links.map((link, currentIndex) =>
    currentIndex === index
      ? { ...link, children: moveAtPath(link.children || [], rest, direction) }
      : link
  );
}

function LinkEditorRow({
  link,
  path,
  siblingCount,
  canEdit,
  linkTargets,
  onUpdate,
  onRemove,
  onAddChild,
  onMove,
}: {
  link: HeaderMenuLink;
  path: LinkPath;
  siblingCount: number;
  canEdit: boolean;
  linkTargets: LinkTarget[];
  onUpdate: (path: LinkPath, values: Partial<HeaderMenuLink>) => void;
  onRemove: (path: LinkPath) => void;
  onAddChild: (path: LinkPath) => void;
  onMove: (path: LinkPath, direction: 'up' | 'down') => void;
}) {
  const isChild = path.length > 1;
  const index = path[path.length - 1];
  const canMoveUp = index > 0;
  const canMoveDown = index < siblingCount - 1;
  const pageTargets = linkTargets.filter((t) => t.type === 'page');
  const blogTargets = linkTargets.filter((t) => t.type === 'blog');

  return (
    <div className={`space-y-2 rounded-md border bg-background p-2 ${isChild ? 'ml-4' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
          <LinkIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{isChild ? 'Sublink' : 'Menu link'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            disabled={!canEdit || !canMoveUp}
            onClick={() => onMove(path, 'up')}
            aria-label="Move menu item up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            disabled={!canEdit || !canMoveDown}
            onClick={() => onMove(path, 'down')}
            aria-label="Move menu item down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={!canEdit}
            onClick={() => onRemove(path)}
            aria-label="Delete menu item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
          <Input
            className="h-8 text-xs"
            value={link.label}
            disabled={!canEdit}
            onChange={(e) => onUpdate(path, { label: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Href</Label>
          <Input
            className="h-8 text-xs"
            value={link.href}
            disabled={!canEdit}
            onChange={(e) =>
              onUpdate(path, { href: e.target.value, onClickValue: e.target.value })
            }
          />
        </div>
      </div>

      <select
        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        value=""
        disabled={!canEdit}
        onChange={(e) => {
          const key = e.target.value;
          if (!key) return;
          const target = linkTargets.find((item) => `${item.type}:${item.slug}` === key);
          if (!target) return;
          const href = hrefForTarget(target);
          onUpdate(path, {
            label: target.label || link.label,
            href,
            onClick: 'redirect',
            onClickValue: href,
          });
        }}
      >
        <option value="">{linkTargets.length === 0 ? 'No targets found' : 'Link to page or blog...'}</option>
        {pageTargets.length > 0 ? (
          <optgroup label="Pages">
            {pageTargets.map((target) => (
              <option key={`page:${target.targetId || target.slug}`} value={`page:${target.slug}`}>
                {target.label} ({target.slug === 'home' ? '/' : `/${target.slug}`})
              </option>
            ))}
          </optgroup>
        ) : null}
        {blogTargets.length > 0 ? (
          <optgroup label="Blogs">
            {blogTargets.map((target) => (
              <option key={`blog:${target.targetId || target.slug}`} value={`blog:${target.slug}`}>
                {target.label} (/blog/{target.slug})
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>

      {!isChild ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full text-xs"
          disabled={!canEdit}
          onClick={() => onAddChild(path)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add sublink
        </Button>
      ) : null}

      {Array.isArray(link.children) && link.children.length > 0 ? (
        <div className="space-y-2 border-l pl-2">
          {link.children.map((child, index) => (
            <LinkEditorRow
              key={`${path.join('-')}-${index}`}
              link={child}
              path={[...path, index]}
              siblingCount={link.children?.length || 0}
              canEdit={canEdit}
              linkTargets={linkTargets}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
              onMove={onMove}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function MenuLinksEditor({ canEdit }: { canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const { activeHeaderId, headerName, contentLists } = useAppSelector((s) => s.menuRedirect);
  const [links, setLinks] = useState<HeaderMenuLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle');
  const lastSavedSnapshotRef = useRef('');
  const latestSnapshotRef = useRef('');

  const linkTargets = useMemo<LinkTarget[]>(() => {
    const pages = contentLists.pages
      .filter((item) => item.slug)
      .map<LinkTarget>((item) => ({
        type: 'page',
        label: item.label,
        slug: item.slug as string,
        targetId: item.targetId,
      }));
    const blogs = contentLists.blogs
      .filter((item) => item.slug)
      .map<LinkTarget>((item) => ({
        type: 'blog',
        label: item.label,
        slug: item.slug as string,
        targetId: item.targetId,
      }));
    return [...pages, ...blogs];
  }, [contentLists.pages, contentLists.blogs]);

  useEffect(() => {
    if (!activeHeaderId) {
      setLinks([]);
      setHasLoaded(false);
      setSaveStatus('idle');
      lastSavedSnapshotRef.current = '';
      latestSnapshotRef.current = '';
      return;
    }

    let alive = true;
    setLoading(true);
    setHasLoaded(false);
    setSaveStatus('idle');
    fetch(`/api/menu-redirect/menu-links?headerId=${activeHeaderId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        const loadedLinks = Array.isArray(json?.data?.links) ? json.data.links : [];
        const snapshot = JSON.stringify(loadedLinks);
        setLinks(loadedLinks);
        lastSavedSnapshotRef.current = snapshot;
        latestSnapshotRef.current = snapshot;
        setHasLoaded(true);
      })
      .catch(() => toast.error('Failed to load menu links'))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [activeHeaderId]);

  useEffect(() => {
    if (!activeHeaderId || !canEdit || !hasLoaded) return;

    const snapshot = JSON.stringify(links);
    latestSnapshotRef.current = snapshot;

    if (snapshot === lastSavedSnapshotRef.current) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('pending');
    const timeout = window.setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch('/api/menu-redirect/menu-links', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ headerId: activeHeaderId, links }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to save menu links');
        lastSavedSnapshotRef.current = snapshot;
        dispatch(loadHeader(activeHeaderId));
        if (latestSnapshotRef.current === snapshot) setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('pending');
        toast.error((err as Error).message);
      }
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [activeHeaderId, canEdit, dispatch, hasLoaded, links]);

  const updateLink = (path: LinkPath, values: Partial<HeaderMenuLink>) => {
    setLinks((current) => updateAtPath(current, path, (link) => ({ ...link, ...values })));
  };

  const addLink = () => {
    setLinks((current) => [...current, emptyLink()]);
  };

  const addChild = (path: LinkPath) => {
    setLinks((current) =>
      updateAtPath(current, path, (link) => ({
        ...link,
        children: [...(link.children || []), emptyLink('New Sublink')],
      }))
    );
  };

  const removeLink = (path: LinkPath) => {
    setLinks((current) => removeAtPath(current, path));
  };

  const moveLink = (path: LinkPath, direction: 'up' | 'down') => {
    setLinks((current) => moveAtPath(current, path, direction));
  };

  if (!activeHeaderId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <p className="text-sm">No active header detected.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{headerName || 'Header'}</h3>
            <p className="text-xs text-muted-foreground">
              Add, delete, rearrange, and nest menu links.
            </p>
          </div>
          {canEdit && hasLoaded ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
              {saveStatus === 'saving' || saveStatus === 'pending' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {saveStatus === 'saving'
                ? 'Saving'
                : saveStatus === 'pending'
                  ? 'Queued'
                  : 'Saved'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading links...</p>
        ) : links.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            This header has no menu links yet.
          </p>
        ) : (
          links.map((link, index) => (
            <LinkEditorRow
              key={index}
              link={link}
              path={[index]}
              siblingCount={links.length}
              canEdit={canEdit}
              linkTargets={linkTargets}
              onUpdate={updateLink}
              onRemove={removeLink}
              onAddChild={addChild}
              onMove={moveLink}
            />
          ))
        )}
      </div>

      <div className="border-t p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!canEdit}
          onClick={addLink}
        >
          <Plus className="mr-1 h-4 w-4" /> Add link
        </Button>
      </div>
    </div>
  );
}
