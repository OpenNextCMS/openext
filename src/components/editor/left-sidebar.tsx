'use client';

import { useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  MoreVertical,
  Plus,
  Settings,
  X,
  FileText,
  Layout,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Page {
  id: string;
  pageName: string;
  preHeading: string;
  description: string;
  seoName: string;
  seoMeta: string;
}

export default function LeftSidebar() {
  const searchParams = useSearchParams();
  // const pageIdFromUrl = searchParams.get("pageId")
  const pageIdFromUrl = searchParams ? searchParams.get('pageId') : null;
  const [pagesOpen, setPagesOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [pages, setPages] = useState<Page[]>([
    {
      id: 'home',
      pageName: 'Home',
      preHeading: 'Welcome',
      description: 'This is a default page',
      seoName: 'OpenNext',
      seoMeta: 'OpenNext is a new CMS type Website.',
    },
  ]);
  const [pageId, setPageId] = useState<Page>({
    id: 'home',
    pageName: 'Home',
    preHeading: 'Welcome',
    description: 'This is a default page',
    seoName: 'OpenNext',
    seoMeta: 'OpenNext is a new CMS type Website.',
  });
  const [newPageName, setNewPageName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openPage, setOpenPage] = useState(false);

  const addNewPage = () => {
    if (newPageName.trim()) {
      const newPage: Page = {
        id: `page-${Date.now()}`,
        pageName: newPageName.trim(),
        preHeading: '',
        description: '',
        seoName: '',
        seoMeta: '',
      };
      setPages([...pages, newPage]);
      setNewPageName('');
      setDialogOpen(false);
      toast.success(`Page "${newPageName.trim()}" created successfully`);
    }
  };

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const fetchPageById = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/pages/get-pages`);
      if (!response.ok) throw new Error('Failed to fetch pages');
      const data = await response.json();
      setPages(data || []);
    } catch {
      toast.error('Failed to load pages');
    }
  }, [backendUrl]);

  useEffect(() => {
    if (pageIdFromUrl) {
      fetchPageById();
    }
  }, [pageIdFromUrl, fetchPageById]);

  return (
    <div className="flex h-full flex-col bg-background">
      {openPage ? (
        <div className="p-4">
          {pageId && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Page Settings</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenPage(false)}
                        className="hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Close page settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={pageId.pageName || ''}
                    readOnly
                    className="bg-muted/40"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="preHead" className="text-sm font-medium">
                    Pre-Heading
                  </Label>
                  <Input
                    id="preHead"
                    type="text"
                    value={pageId.preHeading || ''}
                    readOnly
                    className="bg-muted/40"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    className="min-h-[80px] rounded-md border bg-muted/40 p-3 text-sm"
                    rows={3}
                    value={pageId.description || ''}
                    readOnly
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="seoName" className="text-sm font-medium">
                    SEO Title
                  </Label>
                  <Input
                    id="seoName"
                    type="text"
                    value={pageId.seoName || ''}
                    readOnly
                    className="bg-muted/40"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="seoMeta" className="text-sm font-medium">
                    SEO Description
                  </Label>
                  <textarea
                    id="seoMeta"
                    className="min-h-[80px] rounded-md border bg-muted/40 p-3 text-sm"
                    rows={3}
                    value={pageId.seoMeta || ''}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Page Builder</h2>
          </div>

          <div className="p-2">
            <Collapsible
              open={pagesOpen}
              onOpenChange={setPagesOpen}
              className="rounded-lg border mb-3"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {pagesOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">Pages</span>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Add New Page</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                  Page Name
                                </Label>
                                <Input
                                  id="name"
                                  value={newPageName}
                                  onChange={(e) => setNewPageName(e.target.value)}
                                  className="col-span-3"
                                  placeholder="Enter page name"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit" onClick={addNewPage}>
                                Add Page
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add new page</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-2 space-y-1">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted transition-colors"
                    >
                      <span className="truncate">{page.pageName}</span>
                      <div className="flex items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                onClick={() => {
                                  setOpenPage(true);
                                  setPageId(page);
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Page settings</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>More options</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible
              open={layersOpen}
              onOpenChange={setLayersOpen}
              className="rounded-lg border mb-3"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {layersOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-medium">Layers</span>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-2 pl-4 py-1 hover:bg-muted rounded-md transition-colors">
                    <ChevronRight className="h-4 w-4" />
                    <input type="checkbox" className="h-4 w-4" readOnly />
                    <span>Body</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible className="rounded-lg border">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Layout className="h-4 w-4 text-primary" />
                  <span className="font-medium">My Design</span>
                </div>
              </div>
            </Collapsible>
          </div>
        </div>
      )}
    </div>
  );
}
