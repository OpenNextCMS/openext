'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  MoreVertical,
  Plus,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Page {
  id: string;
  pageName: string;
  preHeading: string;
  description: string;
  seoName: string;
  seoMeta: string;
}

interface PagesComponentProps {
  pages: Page[];
  setPages: (pages: Page[]) => void;
  setPageId: (page: Page) => void;
  setOpenPage: (value: boolean) => void;
}

export default function PagesComponent({
  pages,
  setPages,
  setPageId,
  setOpenPage,
}: PagesComponentProps) {
  const [pagesOpen, setPagesOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');

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

  return (
    <Collapsible open={pagesOpen} onOpenChange={setPagesOpen} className="rounded-lg border mb-3">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {pagesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Pages</span>
        </div>
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

      <CollapsibleContent>
        <div className="px-3 pb-2 space-y-1">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted transition-colors"
            >
              <span className="truncate text-sm">{page.pageName}</span>
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
  );
}
