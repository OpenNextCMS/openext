'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { ImagePlus, Loader2, PlusCircle, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { setBlocks, type BlockData } from '@/redux/canvasSlice';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Re-mint uniqueId on every block (and recursively on children) so re-inserting
// or merging with the existing canvas never produces duplicate React keys.
const cloneBlocksWithFreshIds = (blocks: BlockData[]): BlockData[] =>
  blocks.map((block) => ({
    ...block,
    uniqueId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    children: block.children
      ? block.children.map((column) => cloneBlocksWithFreshIds(column))
      : undefined,
  }));

export default function PromptPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const pageType = searchParams?.get('pageType') || 'page';
  const isPage = pageType === 'page';

  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<BlockData[]>([]);
  const [lastUsage, setLastUsage] = useState<{
    body: number;
    header?: number;
    footer?: number;
  } | null>(null);
  const [autoCreateLayoutParts, setAutoCreateLayoutParts] = useState(false);
  const canvasBlocks = useAppSelector((state) => state.canvas.blocks);
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const blockCount = canvasBlocks.length;

  const canGenerate = useMemo(
    () => !isGenerating && (prompt.trim().length > 0 || Boolean(imageFile)),
    [imageFile, isGenerating, prompt]
  );

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImageFile(file || null);
    setImageName(file?.name || '');
  };

  const handleClear = () => {
    setPrompt('');
    setImageFile(null);
    setImageName('');
    setGeneratedBlocks([]);
    setLastUsage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createLayoutPage = async (
    type: 'header' | 'footer',
    component: BlockData[]
  ): Promise<boolean> => {
    const friendly = type === 'header' ? 'Header' : 'Footer';
    const baseName = `Imported ${friendly} ${new Date().toISOString().slice(0, 10)}`;
    const baseSlug = `${type}-imported-${Date.now()}`;
    try {
      const res = await fetch('/api/pages/add-page', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageName: baseName,
          slug: slugify(baseSlug),
          pageType: type,
          isPublished: true,
          isGlobal: false,
          component,
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || `Failed to create ${type} page`);
      }
      toast.success(`${friendly} page created from image`);
      return true;
    } catch (err) {
      console.error(`Failed to create ${type} page from image:`, err);
      toast.error(err instanceof Error ? err.message : `Failed to create ${type} page`);
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    const formData = new FormData();
    formData.append('prompt', prompt.trim());
    formData.append('pageType', pageType);

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      setIsGenerating(true);
      const response = await fetch('/api/ai/generate-page-json', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to generate JSON');
      }

      const components = Array.isArray(result?.components) ? result.components : [];
      const headerComponents = Array.isArray(result?.headerComponents)
        ? result.headerComponents
        : [];
      const footerComponents = Array.isArray(result?.footerComponents)
        ? result.footerComponents
        : [];

      setGeneratedBlocks(components);
      setLastUsage({
        body: components.length,
        header: headerComponents.length || undefined,
        footer: footerComponents.length || undefined,
      });

      toast.success(`Generated ${components.length} block${components.length === 1 ? '' : 's'}`);

      // Auto-create header / footer pages when on a regular page with image-derived parts
      if (
        isPage &&
        autoCreateLayoutParts &&
        imageFile &&
        (headerComponents.length > 0 || footerComponents.length > 0)
      ) {
        if (headerComponents.length > 0) {
          await createLayoutPage('header', headerComponents);
        }
        if (footerComponents.length > 0) {
          await createLayoutPage('footer', footerComponents);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate JSON');
    } finally {
      setIsGenerating(false);
    }
  };

  const insertGeneratedBlocks = (mode: 'append' | 'replace') => {
    if (generatedBlocks.length === 0) return;

    const fresh = cloneBlocksWithFreshIds(generatedBlocks);
    dispatch(setBlocks(mode === 'replace' ? fresh : [...canvasBlocks, ...fresh]));
    toast.success(mode === 'replace' ? 'Canvas replaced' : 'Blocks inserted');
  };

  const contextLabel =
    pageType === 'header'
      ? 'Header page — output is scoped to nav-bar only'
      : pageType === 'footer'
        ? 'Footer page — output is scoped to footer blocks only'
        : 'Page body — header and footer are skipped; if you upload an image, they will be created as separate pages';

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-primary/5 p-3 text-xs">
        <div className="font-medium">Editing: {pageType}</div>
        <div className="text-muted-foreground">{contextLabel}</div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Prompt</Label>
        <Textarea
          id="ai-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            pageType === 'header'
              ? 'e.g. "Create a horizontal navbar with logo and 4 links on dark background"'
              : pageType === 'footer'
                ? 'e.g. "Three column footer with Company, Resources, Contact and a copyright row"'
                : 'Describe the page, or upload a screenshot and click Generate to recreate it'
          }
          className="min-h-[160px] resize-none text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-reference-image">Reference Image</Label>
        <input
          ref={fileInputRef}
          id="ai-reference-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {imageName || 'Upload image'}
        </Button>
        {imagePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt="Reference preview"
            className="w-full rounded-md border object-contain max-h-40"
          />
        )}
      </div>

      {isPage && imageFile && (
        <label className="flex items-start gap-2 rounded-md border p-3 text-xs">
          <input
            type="checkbox"
            checked={autoCreateLayoutParts}
            onChange={(e) => setAutoCreateLayoutParts(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Auto-create matching <strong>Header</strong> and <strong>Footer</strong> pages from the
            image. Disable to only generate the body.
          </span>
        </label>
      )}

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-0.5">
        <div>Canvas blocks: {blockCount}</div>
        <div>Selected: {selectedBlock?.type || 'None'}</div>
        {lastUsage && (
          <>
            <div>Body blocks generated: {lastUsage.body}</div>
            {lastUsage.header !== undefined && (
              <div>Header blocks extracted: {lastUsage.header}</div>
            )}
            {lastUsage.footer !== undefined && (
              <div>Footer blocks extracted: {lastUsage.footer}</div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" disabled={!canGenerate} onClick={handleGenerate}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? 'Generating' : 'Generate'}
        </Button>
        <Button type="button" variant="outline" onClick={handleClear}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>

      {generatedBlocks.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => insertGeneratedBlocks('append')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Insert
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => insertGeneratedBlocks('replace')}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Replace
            </Button>
          </div>
          <Textarea
            readOnly
            value={JSON.stringify(generatedBlocks, null, 2)}
            className="min-h-[220px] resize-none font-mono text-[11px]"
          />
        </div>
      )}
    </div>
  );
}
