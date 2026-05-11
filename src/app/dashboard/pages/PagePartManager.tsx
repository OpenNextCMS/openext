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
import type { Page } from '@/types/index';

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

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
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
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((page) => (
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
                    ))}
                    {sortedItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
    </div>
  );
}
