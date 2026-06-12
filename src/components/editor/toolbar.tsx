'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { redoCanvas, undoCanvas, clearCanvas, removeBlock, clearSelectedLabel } from '@/redux/canvasSlice';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Redo2,
  Undo2,
  Code,
  Copy,
  Download,
  Eye,
  Maximize,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { safeStorageSet } from '@/utils/safeStorage';
import toast from 'react-hot-toast';

interface ToolbarProps {
  toggleSidebar: () => void;
  onViewChange: (value: 'desktop' | 'tablet' | 'mobile') => void;
}

export default function Toolbar({ toggleSidebar, onViewChange }: ToolbarProps) {
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pageMetadata, setPageMetadata] = useState({
    pageName: '',
    description: '',
    slug: '',
    seoName: '',
    seoMeta: '',
  });

  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const slug = searchParams.get('pagename');
  const userId = searchParams.get('userId');
  const pageID = searchParams.get('pageId');
  const pageType = searchParams.get('pageType') || 'page';
  
  const components = useAppSelector((state) => state.canvas.blocks);
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const historyPast = useAppSelector((state) => state.canvas.historyPast) || [];
  const historyFuture = useAppSelector((state) => state.canvas.historyFuture) || [];
  
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    if (slug) {
      setPageMetadata((prev) => ({ ...prev, slug, pageName: slug }));
    }
  }, [slug]);

  const handleSave = async () => {
    console.log('Toolbar: Saving page...');
    try {
      const res = await fetch(`${backendUrl}/api/pages/update-page`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          pageID,
          updatedComponents: components,
          // slug is provided by pageMetadata (editable in the settings panel)
          ...pageMetadata,
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
    console.log('Toolbar: Opening preview...');
    if (!slug) {
      toast.error('Page name not found');
      return;
    }

    safeStorageSet(`preview:draft-${slug}`, JSON.stringify(components));
    window.open(
      `/preview?pagename=${encodeURIComponent(slug)}&pageType=${encodeURIComponent(pageType)}`,
      '_blank'
    );
  };

  const handleReset = () => {
    console.log('Toolbar: Resetting canvas...');
    if (window.confirm('Are you sure you want to clear the entire canvas? This action can be undone.')) {
      dispatch(clearCanvas());
      toast.success('Canvas cleared');
    }
  };

  const handleDelete = () => {
    console.log('Toolbar: Deleting block...', selectedBlock?.uniqueId);
    if (selectedBlock) {
      dispatch(removeBlock(selectedBlock.uniqueId));
      dispatch(clearSelectedLabel());
      toast.success('Block deleted');
    } else {
      toast.error('Select a block to delete');
    }
  };

  const handleFullscreen = () => {
    console.log('Toolbar: Toggling fullscreen...');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleExport = () => {
    console.log('Toolbar: Exporting JSON...');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(currentPageCode);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `page-${slug || 'export'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Page JSON exported');
  };

  const currentPageCode = JSON.stringify(
    {
      slug,
      pageID,
      pageType,
      metadata: pageMetadata,
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
      <TooltipProvider>
        <div className="relative border-b p-2 flex items-center justify-between mx-9 bg-background">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset/Clear All</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  disabled={!canUndo}
                  onClick={() => {
                    console.log('Toolbar: Undoing...');
                    dispatch(undoCanvas());
                  }}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  disabled={!canRedo}
                  onClick={() => {
                    console.log('Toolbar: Redoing...');
                    dispatch(redoCanvas());
                  }}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  onClick={handleFullscreen}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fullscreen</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export JSON</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary text-destructive hover:text-destructive"
                  disabled={!selectedBlock}
                  onClick={handleDelete}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Selected</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Page Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div>
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
      </TooltipProvider>

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

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pageName">Page Name</Label>
              <Input 
                id="pageName" 
                value={pageMetadata.pageName} 
                onChange={(e) => setPageMetadata({...pageMetadata, pageName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input 
                id="slug" 
                value={pageMetadata.slug} 
                onChange={(e) => setPageMetadata({...pageMetadata, slug: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={pageMetadata.description} 
                onChange={(e) => setPageMetadata({...pageMetadata, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seoName">SEO Title</Label>
              <Input 
                id="seoName" 
                value={pageMetadata.seoName} 
                onChange={(e) => setPageMetadata({...pageMetadata, seoName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seoMeta">SEO Meta Description</Label>
              <Textarea 
                id="seoMeta" 
                value={pageMetadata.seoMeta} 
                onChange={(e) => setPageMetadata({...pageMetadata, seoMeta: e.target.value})}
              />
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
