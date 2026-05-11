'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle,
  Edit,
  Eye,
  Loader2,
  PlusCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BlockData, Page } from '@/types/index';
import { headerTemplates } from './headerTemplates';
import { headerColorPresets, matchPreset, HeaderColorPreset } from './headerColors';

type NavbarLayout = 'horizontal' | 'vertical' | 'hamburger' | 'two-line';

const getCurrentLayout = (page: Page): NavbarLayout | null => {
  const blocks = (page.component || []) as BlockData[];
  for (const block of blocks) {
    if (block?.type === 'nav-bar') {
      try {
        const parsed = JSON.parse(block.content || '{}');
        return (parsed.layout as NavbarLayout) || 'horizontal';
      } catch {
        return 'horizontal';
      }
    }
  }
  return null;
};

const applyLayoutToBlocks = (
  blocks: BlockData[],
  newLayout: NavbarLayout
): BlockData[] =>
  blocks.map((block) => {
    if (block?.type !== 'nav-bar') return block;
    try {
      const parsed = JSON.parse(block.content || '{}');
      return {
        ...block,
        content: JSON.stringify({ ...parsed, layout: newLayout }),
      };
    } catch {
      return block;
    }
  });

const getCurrentColors = (page: Page): { backgroundColor: string; color: string } | null => {
  const blocks = (page.component || []) as BlockData[];
  for (const block of blocks) {
    if (block?.type === 'nav-bar') {
      return {
        backgroundColor: (block.style?.backgroundColor as string) || '#ffffff',
        color: (block.style?.color as string) || '#111111',
      };
    }
  }
  return null;
};

const applyColorsToBlocks = (
  blocks: BlockData[],
  backgroundColor: string,
  color: string
): BlockData[] =>
  blocks.map((block) => {
    if (block?.type !== 'nav-bar') return block;
    return {
      ...block,
      style: {
        ...(block.style || {}),
        backgroundColor,
        color,
      },
    };
  });

interface PagePartManagerProps {
  pageType: 'header' | 'footer';
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

const generateSlug = (value: string, pageType: 'header' | 'footer') => {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return base ? `${pageType}-${base}` : '';
};

export default function PagePartManager({ pageType }: PagePartManagerProps) {
  const isHeader = pageType === 'header';
  const [items, setItems] = useState<Page[]>([]);
  const [userId, setUserId] = useState('');
  const [name, setName] = useState(isHeader ? 'Main Header' : 'Main Footer');
  const [slug, setSlug] = useState(generateSlug(isHeader ? 'Main Header' : 'Main Footer', pageType));
  const [isPublished, setIsPublished] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    isHeader ? headerTemplates[0].id : 'blank'
  );
  const [customColorPage, setCustomColorPage] = useState<Page | null>(null);
  const [customBg, setCustomBg] = useState('#ffffff');
  const [customFg, setCustomFg] = useState('#111111');

  const title = isHeader ? 'Header Management' : 'Footer Management';
  const description = isHeader
    ? 'Create and manage reusable site headers.'
    : 'Create and manage reusable site footers.';
  const Icon = isHeader ? ArrowUpToLine : ArrowDownToLine;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(Boolean(b.isGlobal)) - Number(Boolean(a.isGlobal))),
    [items]
  );

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/pages/get-pages`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) throw new Error('Failed to fetch layout parts');

      const data = await response.json();
      setUserId(data.userId || '');
      setItems(
        (data.pages || []).filter((page: Page) => (page.pageType || 'page') === pageType)
      );
    } catch (error) {
      console.error(error);
      toast.error(`Failed to load ${pageType}s`);
    } finally {
      setIsLoading(false);
    }
  }, [pageType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value, pageType));
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;

    setIsCreating(true);
    try {
      const selectedTemplate = isHeader
        ? headerTemplates.find((t) => t.id === selectedTemplateId)
        : undefined;
      const component = selectedTemplate ? selectedTemplate.buildBlocks() : undefined;

      const response = await fetch(`${backendUrl}/api/pages/add-page`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageName: name.trim(),
          slug: slug.trim(),
          pageType,
          isPublished,
          isGlobal: items.length === 0,
          ...(component ? { component } : {}),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to create ${pageType}`);
      }

      toast.success(`${isHeader ? 'Header' : 'Footer'} created`);
      window.open(
        `/Editor?pagename=${encodeURIComponent(slug)}&userId=${result.userId}&pageId=${result.data._id}&pageType=${pageType}`,
        '_blank'
      );
      await fetchItems();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : `Failed to create ${pageType}`);
    } finally {
      setIsCreating(false);
    }
  };

  const applyColors = async (page: Page, backgroundColor: string, color: string) => {
    const blocks = (page.component || []) as BlockData[];
    if (!blocks.some((b) => b?.type === 'nav-bar')) {
      toast.error('This header has no navbar block to recolor');
      return;
    }
    const updatedComponents = applyColorsToBlocks(blocks, backgroundColor, color);

    try {
      const response = await fetch(`${backendUrl}/api/pages/update-page`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageID: page._id || page.id,
          slug: page.slug,
          updatedComponents,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Failed to change colors');

      await fetchItems();
      toast.success('Header colors updated');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to change colors');
    }
  };

  const handleColorSelect = (page: Page, value: string) => {
    if (value === 'custom') {
      const current = getCurrentColors(page);
      setCustomBg(current?.backgroundColor || '#ffffff');
      setCustomFg(current?.color || '#111111');
      setCustomColorPage(page);
      return;
    }
    const preset = headerColorPresets.find((p) => p.id === value);
    if (!preset) return;
    applyColors(page, preset.backgroundColor, preset.color);
  };

  const saveCustomColors = async () => {
    if (!customColorPage) return;
    const page = customColorPage;
    setCustomColorPage(null);
    await applyColors(page, customBg, customFg);
  };

  const changeHeaderLayout = async (page: Page, newLayout: NavbarLayout) => {
    const blocks = (page.component || []) as BlockData[];
    if (!blocks.some((b) => b?.type === 'nav-bar')) {
      toast.error('This header has no navbar block to update');
      return;
    }
    const updatedComponents = applyLayoutToBlocks(blocks, newLayout);

    try {
      const response = await fetch(`${backendUrl}/api/pages/update-page`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageID: page._id || page.id,
          slug: page.slug,
          updatedComponents,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Failed to change layout');

      await fetchItems();
      toast.success('Header style updated');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to change layout');
    }
  };

  const updateItem = async (page: Page, updates: Partial<Page>) => {
    try {
      const response = await fetch(`${backendUrl}/api/pages/update-page`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageID: page._id || page.id,
          slug: page.slug,
          ...updates,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || `Failed to update ${pageType}`);

      await fetchItems();
      toast.success(`${isHeader ? 'Header' : 'Footer'} updated`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : `Failed to update ${pageType}`);
    }
  };

  const openEditor = (page: Page) => {
    window.open(
      `/Editor?pagename=${encodeURIComponent(page.slug || '')}&userId=${userId}&pageId=${page._id || page.id}&pageType=${pageType}`,
      '_blank'
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Icon className="h-7 w-7 text-primary" />
            {title}
          </h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={fetchItems} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className={`grid gap-6 ${isHeader ? 'lg:grid-cols-[520px_1fr]' : 'lg:grid-cols-[420px_1fr]'}`}>
        <Card>
          <CardHeader>
            <CardTitle>Create {isHeader ? 'Header' : 'Footer'}</CardTitle>
            <CardDescription>
              The first created {pageType} is automatically marked active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            {isHeader && (
              <div className="space-y-2">
                <Label>Header Style</Label>
                <p className="text-xs text-muted-foreground">
                  Pick a starting layout — you can fully edit it after.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {headerTemplates.map((template) => {
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`group flex flex-col gap-2 rounded-md border p-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <template.Preview />
                        <div className="px-1">
                          <div className="text-sm font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              Published
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </label>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              Create and Edit
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isHeader ? 'Headers' : 'Footers'}</CardTitle>
              <Badge variant="outline">{sortedItems.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      {isHeader && <TableHead>Style</TableHead>}
                      {isHeader && <TableHead>Color</TableHead>}
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((page) => {
                      const currentLayout = isHeader ? getCurrentLayout(page) : null;
                      const currentColors = isHeader ? getCurrentColors(page) : null;
                      const currentPreset: HeaderColorPreset | null = currentColors
                        ? matchPreset(currentColors.backgroundColor, currentColors.color)
                        : null;
                      const colorSelectValue = currentPreset ? currentPreset.id : 'custom-current';
                      return (
                      <TableRow key={page._id || page.id}>
                        <TableCell>
                          <div className="font-medium">{page.pageName}</div>
                          <div className="text-xs text-muted-foreground">{page.slug}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                            {page.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        {isHeader && (
                          <TableCell>
                            {currentLayout ? (
                              <Select
                                value={currentLayout}
                                onValueChange={(v) =>
                                  changeHeaderLayout(page, v as NavbarLayout)
                                }
                              >
                                <SelectTrigger className="h-8 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="horizontal">Horizontal</SelectItem>
                                  <SelectItem value="vertical">Vertical</SelectItem>
                                  <SelectItem value="hamburger">Hamburger</SelectItem>
                                  <SelectItem value="two-line">Two Line</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        )}
                        {isHeader && (
                          <TableCell>
                            {currentColors ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-4 w-4 rounded border"
                                  style={{
                                    backgroundColor: currentColors.backgroundColor,
                                    borderColor: '#e5e7eb',
                                  }}
                                />
                                <Select
                                  value={colorSelectValue}
                                  onValueChange={(v) => handleColorSelect(page, v)}
                                >
                                  <SelectTrigger className="h-8 w-[140px]">
                                    <SelectValue placeholder="Custom" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {headerColorPresets.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        <span className="flex items-center gap-2">
                                          <span
                                            className="inline-block h-3 w-3 rounded border"
                                            style={{
                                              backgroundColor: p.backgroundColor,
                                              borderColor: '#e5e7eb',
                                            }}
                                          />
                                          {p.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                    {!currentPreset && (
                                      <SelectItem value="custom-current" disabled>
                                        Custom (current)
                                      </SelectItem>
                                    )}
                                    <SelectItem value="custom">Custom…</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Switch
                            checked={Boolean(page.isGlobal)}
                            onCheckedChange={(checked) =>
                              updateItem(page, {
                                isGlobal: checked,
                                ...(checked ? { isPublished: true } : {}),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `/preview?pagename=${encodeURIComponent(page.slug || '')}&pageType=${pageType}`,
                                  '_blank'
                                )
                              }
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Preview
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditor(page)}>
                              <Edit className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant={page.isPublished ? 'secondary' : 'default'}
                              size="sm"
                              onClick={() =>
                                updateItem(page, { isPublished: !page.isPublished })
                              }
                            >
                              {page.isPublished ? (
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              )}
                              {page.isPublished ? 'Unpublish' : 'Publish'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {sortedItems.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={isHeader ? 6 : 4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No {pageType}s created yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!customColorPage}
        onOpenChange={(open) => !open && setCustomColorPage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom header colors</DialogTitle>
            <DialogDescription>
              Pick a background and text color. Applies to the navbar block only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Label className="w-28">Background</Label>
              <input
                type="color"
                value={customBg.startsWith('#') ? customBg : '#ffffff'}
                onChange={(e) => setCustomBg(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border"
              />
              <Input
                value={customBg}
                onChange={(e) => setCustomBg(e.target.value)}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-28">Text</Label>
              <input
                type="color"
                value={customFg.startsWith('#') ? customFg : '#111111'}
                onChange={(e) => setCustomFg(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border"
              />
              <Input
                value={customFg}
                onChange={(e) => setCustomFg(e.target.value)}
                placeholder="#111111"
                className="flex-1"
              />
            </div>
            <div
              className="rounded-md border p-3 text-sm font-medium"
              style={{ backgroundColor: customBg, color: customFg }}
            >
              Preview — Brand · Home · About · Services
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomColorPage(null)}>
              Cancel
            </Button>
            <Button onClick={saveCustomColors}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
