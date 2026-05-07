'use client';

import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/redux/hooks';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  RedoIcon as ArrowRedo,
  UndoIcon as ArrowUndo,
  Code,
  Copy,
  Download,
  Eye,
  Fullscreen,
  PlusSquare,
  RotateCcw,
  Settings,
  Trash,
  Save,
  SkipBack,
} from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { safeStorageSet } from '@/utils/safeStorage';
import toast, { Toaster } from 'react-hot-toast';

interface ToolbarProps {
  toggleSidebar: () => void;
  onViewChange: (value: 'desktop' | 'tablet' | 'mobile') => void;
}

export default function Toolbar({ toggleSidebar, onViewChange }: ToolbarProps) {
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const searchParams = useSearchParams();
  const slug = searchParams.get('pagename');
  const userId = searchParams.get('userId');
  const pageID = searchParams.get('pageId');
  console.log('Page ID:', pageID);
  const components = useAppSelector((state) => state.canvas.blocks);
  console.log(components);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  const handleSave = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/pages/update-page`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          userId,
          pageID,
          updatedComponents: components,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || `Failed to save page (${res.status})`);
      }
      toast.success('Page saved successfully');
      return true;
    } catch (error) {
      console.error('Save Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save page');
      return false;
    }
  };

  const handleSaveAndExit = async () => {
    const saved = await handleSave();
    if (saved) {
      toast.success('Page saved successfully, closing editor...');
      window.close();
    }
  };

  const handlePreview = async () => {
    if (!slug) {
      toast.error('Page name not found');
      return;
    }

    safeStorageSet(`preview:draft-${slug}`, JSON.stringify(components));
    window.open(`/preview?pagename=${encodeURIComponent(slug)}`, '_blank');
  };

  const currentPageCode = JSON.stringify(
    {
      slug,
      pageID,
      components,
    },
    null,
    2
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentPageCode);
      toast.success('Code copied');
    } catch (error) {
      console.error('Copy Error:', error);
      toast.error('Failed to copy code');
    }
  };

  return (
    <>
      <div className="relative border-b p-2 flex items-center justify-between mx-9 bg-background">
        <Toaster />
        <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <ArrowUndo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <ArrowRedo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Preview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <Fullscreen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fullscreen</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                onClick={() => setIsCodeOpen(true)}
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View code</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        </div>

        <div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleSidebar}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary"
              >
                <PlusSquare className="h-4 w-4" />
                <span>Add Block</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add new block</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-primary"
          onClick={() => handleSaveAndExit()}
        >
          <SkipBack className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button variant="outline" size="sm" className="text-primary" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>

        <div className="mr-3">
          <Select
            defaultValue="desktop"
            onValueChange={(value: string) =>
              onViewChange(value as 'desktop' | 'tablet' | 'mobile')
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </div>
      </div>
      <Dialog open={isCodeOpen} onOpenChange={setIsCodeOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Page Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Current editor state. Unsaved changes are included.
              </p>
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>

            <Textarea
              readOnly
              value={currentPageCode}
              className="min-h-[520px] resize-none font-mono text-xs leading-relaxed"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
