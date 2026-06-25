'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setSearchQuery, selectFilteredContent, type ContentTab } from '@/redux/menuRedirectSlice';
import type { ContentItem } from '@/types/menu-redirect';
import ContentCard from './cards/ContentCard';

type Tab = ContentTab | 'anchors' | 'external';
const TABS: { key: Tab; label: string }[] = [
  { key: 'pages', label: 'Pages' },
  { key: 'blogs', label: 'Blogs' },
  { key: 'blog-categories', label: 'Categories' },
  { key: 'cms', label: 'CMS' },
  { key: 'anchors', label: 'Anchors' },
  { key: 'external', label: 'External' },
];

export default function LeftPanel({ canEdit }: { canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('pages');
  const search = useAppSelector((s) => s.menuRedirect.searchQuery);

  // Local lists for user-typed anchor/external targets.
  const [typed, setTyped] = useState<Record<'anchors' | 'external', ContentItem[]>>({
    anchors: [],
    external: [],
  });
  const [draft, setDraft] = useState('');

  const contentTab: ContentTab | null =
    tab === 'anchors' || tab === 'external' ? null : (tab as ContentTab);
  const filtered = useAppSelector(
    contentTab ? selectFilteredContent(contentTab) : () => [] as ContentItem[]
  );

  const addTyped = () => {
    const value = draft.trim();
    if (!value) return;
    if (tab === 'anchors') {
      const url = value.startsWith('#') ? value : `#${value}`;
      setTyped((t) => ({ ...t, anchors: [{ targetType: 'anchor', label: url, targetUrl: url }, ...t.anchors] }));
    } else if (tab === 'external') {
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      setTyped((t) => ({
        ...t,
        external: [{ targetType: 'external', label: url, targetUrl: url }, ...t.external],
      }));
    }
    setDraft('');
  };

  const items: ContentItem[] = contentTab ? filtered : typed[tab as 'anchors' | 'external'];

  return (
    <div className="flex h-full flex-col border-r">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b p-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              dispatch(setSearchQuery(''));
              setTab(t.key);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search (content tabs) or typed input (anchors/external) */}
      <div className="space-y-2 border-b p-2">
        {contentTab ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Search…"
              value={search}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              className="h-9"
              placeholder={tab === 'anchors' ? '#section-id' : 'https://example.com'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTyped()}
              disabled={!canEdit}
            />
            <Button size="sm" onClick={addTyped} disabled={!canEdit || !draft.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            {contentTab ? 'No items.' : `Type a ${tab === 'anchors' ? 'anchor' : 'URL'} above to create a draggable card.`}
          </p>
        ) : (
          items.map((item) => <ContentCard key={`${item.targetType}-${item.targetId ?? item.targetUrl ?? item.label}`} item={item} disabled={!canEdit} />)
        )}
      </div>
    </div>
  );
}
