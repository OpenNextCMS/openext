'use client';

import { Plus, Trash2, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateMapping } from '@/redux/menuRedirectSlice';
import type { MenuRedirectMapping } from '@/types/menu-redirect';
import MenuLinksEditor from './MenuLinksEditor';

function KeyValueEditor({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const entries = Object.entries(value || {});
  const setEntry = (i: number, k: string, v: string) => {
    const next: Record<string, string> = {};
    entries.forEach(([ek, ev], idx) => {
      if (idx === i) next[k] = v;
      else next[ek] = ev;
    });
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-2">
          <Input
            className="h-8"
            placeholder="key"
            value={k}
            disabled={disabled}
            onChange={(e) => setEntry(i, e.target.value, v)}
          />
          <Input
            className="h-8"
            placeholder="value"
            value={v}
            disabled={disabled}
            onChange={(e) => setEntry(i, k, e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
            onClick={() => onChange(Object.fromEntries(entries.filter((_, idx) => idx !== i)))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange({ ...value, '': '' })}
      >
        <Plus className="mr-1 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function RedirectSettings({ canEdit }: { canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.menuRedirect.selectedMenuItemId);
  const mapping = useAppSelector((s) =>
    selectedId ? s.menuRedirect.mappings[selectedId] : undefined
  );
  const menuItem = useAppSelector((s) =>
    s.menuRedirect.menuItems.find((m) => m.id === selectedId)
  );

  if (!selectedId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <Settings2 className="mb-3 h-8 w-8" />
        <p className="text-sm">Select a menu item to configure its redirect.</p>
      </div>
    );
  }

  if (!mapping) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <p className="font-medium">{menuItem?.label}</p>
        <p className="mt-1 text-sm">Drag a target from the left to link this item.</p>
      </div>
    );
  }

  const patch = (p: Partial<MenuRedirectMapping>) => {
    if (!mapping._id) return;
    dispatch(updateMapping(mapping._id, { menuItemId: mapping.menuItemId, ...p }));
  };

  const Toggle = ({
    label,
    desc,
    checked,
    onChange,
  }: {
    label: string;
    desc?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <Label>{label}</Label>
        {desc ? <p className="text-xs text-muted-foreground">{desc}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={!canEdit} />
    </div>
  );

  return (
    <div className="h-full space-y-5 overflow-y-auto p-4">
      <div>
        <h3 className="font-semibold">{menuItem?.label}</h3>
        <p className="text-xs text-muted-foreground">Redirect configuration</p>
      </div>

      {/* Read-only summary */}
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
        <Row label="Target type" value={mapping.targetType} />
        <Row label="Target" value={mapping.targetSlug || mapping.targetId || '—'} />
        <Row label="URL preview" value={mapping.targetUrl || '—'} mono />
      </div>

      {/* Toggles */}
      <div className="space-y-1">
        <Toggle
          label="Enable redirect"
          desc="Disabling keeps the mapping but makes the item non-clickable."
          checked={mapping.enabled}
          onChange={(v) => patch({ enabled: v })}
        />
        <Toggle
          label="Open in new tab"
          checked={mapping.openInNewTab}
          onChange={(v) => patch({ openInNewTab: v })}
        />
        <Toggle label="Nofollow" checked={mapping.nofollow} onChange={(v) => patch({ nofollow: v })} />
        <Toggle
          label="Track click analytics"
          checked={mapping.trackClicks}
          onChange={(v) => patch({ trackClicks: v })}
        />
      </div>

      {/* Custom URL */}
      <div className="space-y-1">
        <Label>Custom URL (override)</Label>
        <Input
          defaultValue={mapping.targetUrl ?? ''}
          disabled={!canEdit}
          onBlur={(e) => e.target.value !== mapping.targetUrl && patch({ targetUrl: e.target.value })}
        />
      </div>

      {/* Custom CSS class */}
      <div className="space-y-1">
        <Label>Custom CSS class</Label>
        <Input
          defaultValue={mapping.customClass ?? ''}
          disabled={!canEdit}
          onBlur={(e) => e.target.value !== mapping.customClass && patch({ customClass: e.target.value })}
        />
      </div>

      {/* Dynamic params */}
      <div className="space-y-2">
        <Label>Dynamic parameters (query string)</Label>
        <KeyValueEditor
          value={mapping.dynamicParams || {}}
          disabled={!canEdit}
          onChange={(v) => patch({ dynamicParams: v })}
        />
      </div>

      {/* Custom data attributes */}
      <div className="space-y-2">
        <Label>Custom data attributes</Label>
        <KeyValueEditor
          value={mapping.dataAttributes || {}}
          disabled={!canEdit}
          onChange={(v) => patch({ dataAttributes: v })}
        />
      </div>
    </div>
  );
}

export default function RightPanel({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="h-full overflow-hidden border-l">
      <Tabs defaultValue="redirect" className="flex h-full flex-col">
        <div className="border-b p-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="redirect">Redirect</TabsTrigger>
            <TabsTrigger value="links">Menu Links</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="redirect" className="m-0 min-h-0 flex-1 overflow-hidden">
          <RedirectSettings canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="links" className="m-0 min-h-0 flex-1 overflow-hidden">
          <MenuLinksEditor canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
