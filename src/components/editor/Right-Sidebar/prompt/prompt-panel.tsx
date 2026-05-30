'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { Braces, ImagePlus, Loader2, PlusCircle, RefreshCw, Trash2, Wand2 } from 'lucide-react';
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

const normalizeLabel = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

type RawBlock = Partial<BlockData> & {
  placeholder?: string;
  children?: RawBlock[][];
};

const getTextFromColumns = (children?: RawBlock[][]) => {
  if (!children) return [];
  return children
    .flat()
    .map((child) => (typeof child.content === 'string' ? child.content.trim() : ''))
    .filter(Boolean);
};

const getColumnIdFromChildren = (children?: RawBlock[][]) => {
  const count = Math.max(1, Math.min(children?.length || 1, 3));
  return `${count}-column`;
};

const normalizeImportedBlockShape = (rawBlock: RawBlock): BlockData => {
  const marker = `${normalizeLabel(rawBlock.id)} ${normalizeLabel(rawBlock.type)} ${normalizeLabel(
    rawBlock.label
  )}`;
  const looseStyle = rawBlock.style as Record<string, unknown> | undefined;
  const rawChildren = Array.isArray(rawBlock.children) ? rawBlock.children : undefined;
  const normalizedChildren = rawChildren?.map((column) =>
    Array.isArray(column) ? column.map(normalizeImportedBlockShape) : []
  );

  let type: BlockData['type'] = 'text';
  let id = typeof rawBlock.id === 'string' ? rawBlock.id : undefined;
  let content = typeof rawBlock.content === 'string' ? rawBlock.content : '';
  let icon = rawBlock.icon;
  let children = normalizedChildren;

  if (marker.includes('nav bar') || marker.includes('navbar')) {
    type = 'nav-bar';
    id = 'nav-bar';
    const [logo] = getTextFromColumns(rawChildren);
    content = JSON.stringify({
      logo: logo || 'Brand',
      logoType: 'text',
      logoImage: '',
      layout: 'horizontal',
      links: [
        { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Services', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
      ],
    });
    children = undefined;
  } else if (marker.includes('3 column')) {
    type = 'column';
    id = '3-column';
  } else if (marker.includes('2 column')) {
    type = 'column';
    id = '2-column';
  } else if (marker.includes('1 column') || marker.includes('single column')) {
    type = 'column';
    id = '1-column';
  } else if (marker.includes('row layout') || marker === ' row ') {
    type = 'row';
    id = 'row';
  } else if (marker.includes('card block')) {
    type = 'card';
    id = 'card';
    const [title, body] = getTextFromColumns(rawChildren);
    if (!content && (title || body)) {
      content = JSON.stringify({
        title: title || rawBlock.label || 'Card',
        body: body || '',
        buttonText: '',
      });
    }
    children = undefined;
  } else if (marker.includes('stats block') && rawChildren?.length) {
    type = 'column';
    id = getColumnIdFromChildren(rawChildren);
  } else if (marker.includes('stats block')) {
    type = 'stats';
    id = 'stats';
  } else if (marker.includes('heading block')) {
    type = 'text';
    id = 'heading';
  } else if (marker.includes('text block')) {
    type = 'text';
    id = 'text';
  } else if (marker.includes('button')) {
    type = 'button';
    id = 'button';
  } else if (marker.includes('icon block')) {
    type = 'icon';
    id = 'icon';
    icon = typeof content === 'string' ? content : icon;
  } else if (marker.includes('input box')) {
    type = 'input';
    id = 'input';
  } else if (marker.includes('textarea')) {
    type = 'textarea';
    id = 'textarea';
  } else if (marker.includes('separator')) {
    type = 'separator';
    id = 'separator';
  } else if (marker.includes('shape divider')) {
    type = 'shape-divider';
    id = 'shape-divider';
  } else if (marker.includes('progress bar')) {
    type = 'progress';
    id = 'progress';
    const percentage = Number.parseInt(content, 10);
    content = JSON.stringify({
      label: rawBlock.label || 'Progress',
      percentage: Number.isFinite(percentage) ? percentage : 100,
      barColor: typeof looseStyle?.progressColor === 'string' ? looseStyle.progressColor : '#22d3ee',
    });
  } else if (marker.includes('countdown')) {
    type = 'countdown';
    id = 'countdown';
  } else if (marker.includes('image')) {
    type = 'image';
    id = 'image';
  } else if (marker.includes('radio')) {
    type = 'radio';
    id = 'radio';
  } else if (marker.includes('checkbox')) {
    type = 'checkbox';
    id = 'checkbox';
  } else if (marker.includes('column') && rawChildren?.length) {
    type = 'column';
    id = getColumnIdFromChildren(rawChildren);
  } else if (marker.includes('row') && rawChildren?.length) {
    type = 'row';
    id = 'row';
  }

  return {
    ...rawBlock,
    id,
    type,
    content,
    icon,
    style: rawBlock.style || {},
    uniqueId: rawBlock.uniqueId || createBlockId(),
    ...(children ? { children } : {}),
  } as BlockData;
};

const parseBlocksJson = (value: string): BlockData[] => {
  const parsed = JSON.parse(value);
  const blocks = Array.isArray(parsed) ? parsed : parsed?.components;

  if (!Array.isArray(blocks)) {
    throw new Error('JSON must be an array of blocks or an object with a components array');
  }

  return (blocks as RawBlock[]).map(normalizeImportedBlockShape);
};

/** Body blocks only, or full object when header/footer were extracted from an image. */
const stringifyGeneratedOutput = (
  components: BlockData[],
  headerComponents: BlockData[],
  footerComponents: BlockData[]
): string => {
  const hasLayoutExtras =
    headerComponents.length > 0 || footerComponents.length > 0;
  if (!hasLayoutExtras) {
    return JSON.stringify(components, null, 2);
  }
  const payload: {
    components: BlockData[];
    headerComponents?: BlockData[];
    footerComponents?: BlockData[];
  } = { components };
  if (headerComponents.length > 0) payload.headerComponents = headerComponents;
  if (footerComponents.length > 0) payload.footerComponents = footerComponents;
  return JSON.stringify(payload, null, 2);
};

const createBlockId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeBlockIds = (blocks: BlockData[], usedIds = new Set<string>()): BlockData[] =>
  blocks.map((block) => {
    const currentId = typeof block.uniqueId === 'string' ? block.uniqueId.trim() : '';
    const uniqueId = currentId && !usedIds.has(currentId) ? currentId : createBlockId();
    usedIds.add(uniqueId);

    return {
      ...block,
      uniqueId,
      children: block.children?.map((column) => normalizeBlockIds(column, usedIds)),
    };
  });

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
  const [generatedJson, setGeneratedJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [lastUsage, setLastUsage] = useState<{
    body: number;
    header?: number;
    footer?: number;
  } | null>(null);
  const [autoCreateLayoutParts, setAutoCreateLayoutParts] = useState(true);
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
    setGeneratedJson('');
    setJsonError('');
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

      if (result?.mode === 'site' && result?.home) {
        const sitePages = Array.isArray(result.pages) ? result.pages : [];
        const bodyCount = sitePages.filter(
          (p: { pageType?: string }) => p.pageType === 'page'
        ).length;
        const hasHeader = sitePages.some((p: { pageType?: string }) => p.pageType === 'header');
        const hasFooter = sitePages.some((p: { pageType?: string }) => p.pageType === 'footer');
        const parts = [
          `${bodyCount} page${bodyCount === 1 ? '' : 's'}`,
          hasHeader ? '+ header' : '',
          hasFooter ? '+ footer' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const liveUrl = result.home.url || `/${result.home.slug || ''}`;
        toast.success(`Site created: ${parts}. Live: ${liveUrl}`, { duration: 8000 });

        // Open the live site in a new tab so the user can navigate the whole
        // website with working header/footer links, while the editor loads the
        // home page in this tab.
        try {
          window.open(liveUrl, '_blank', 'noopener,noreferrer');
        } catch {
          /* popup blocked — user can still click the live URL in the toast */
        }

        const homeSlug = encodeURIComponent(result.home.slug || '');
        const homeId = encodeURIComponent(result.home._id || '');
        const userId = encodeURIComponent(result.userId || '');
        window.location.href = `/Editor?pagename=${homeSlug}&userId=${userId}&pageId=${homeId}&pageType=page`;
        return;
      }

      const components = Array.isArray(result?.components) ? result.components : [];
      const headerComponents = Array.isArray(result?.headerComponents)
        ? result.headerComponents
        : [];
      const footerComponents = Array.isArray(result?.footerComponents)
        ? result.footerComponents
        : [];

      setGeneratedBlocks(components);
      setGeneratedJson(
        stringifyGeneratedOutput(components, headerComponents, footerComponents)
      );
      setJsonError('');
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

  const getEditedBlocks = () => {
    try {
      const blocks = normalizeBlockIds(parseBlocksJson(generatedJson));
      setGeneratedBlocks(blocks);
      setJsonError('');
      return blocks;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      setJsonError(message);
      toast.error(message);
      return null;
    }
  };

  const formatGeneratedJson = () => {
    const trimmed = generatedJson.trim();
    if (!trimmed) return;

    try {
      const parsed: unknown = JSON.parse(trimmed);
      const blocks = normalizeBlockIds(parseBlocksJson(trimmed));
      setGeneratedBlocks(blocks);
      setJsonError('');

      if (Array.isArray(parsed)) {
        setGeneratedJson(JSON.stringify(blocks, null, 2));
      } else if (parsed && typeof parsed === 'object') {
        const rec = parsed as Record<string, unknown>;
        const out: Record<string, unknown> = { components: blocks };
        if (Array.isArray(rec.headerComponents)) out.headerComponents = rec.headerComponents;
        if (Array.isArray(rec.footerComponents)) out.footerComponents = rec.footerComponents;
        setGeneratedJson(JSON.stringify(out, null, 2));
      } else {
        setGeneratedJson(JSON.stringify(blocks, null, 2));
      }
      toast.success('JSON formatted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      setJsonError(message);
      toast.error(message);
    }
  };

  const insertGeneratedBlocks = (mode: 'append' | 'replace') => {
    if (!generatedJson.trim()) return;

    const editedBlocks = getEditedBlocks();
    if (!editedBlocks) return;

    dispatch(
      setBlocks(mode === 'replace' ? editedBlocks : [...canvasBlocks, ...editedBlocks])
    );
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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="generated-json-editor">Generated JSON</Label>
            <Button type="button" size="sm" variant="ghost" onClick={formatGeneratedJson}>
              <Braces className="mr-2 h-4 w-4" />
              Format
            </Button>
          </div>
          <Textarea
            id="generated-json-editor"
            value={generatedJson}
            onChange={(event) => {
              setGeneratedJson(event.target.value);
              if (jsonError) setJsonError('');
            }}
            className="min-h-[280px] resize-y font-mono text-[11px]"
          />
          {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
        </div>
      )}
    </div>
  );
}
