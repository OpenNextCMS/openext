'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2, PlusCircle, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { setBlocks, type BlockData } from '@/redux/canvasSlice';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';

export default function PromptPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dispatch = useAppDispatch();
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<BlockData[]>([]);
  const canvasBlocks = useAppSelector((state) => state.canvas.blocks);
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const blockCount = canvasBlocks.length;

  const canGenerate = useMemo(
    () => !isGenerating && (prompt.trim().length > 0 || Boolean(imageFile)),
    [imageFile, isGenerating, prompt]
  );

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    const formData = new FormData();
    formData.append('prompt', prompt.trim());

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
      setGeneratedBlocks(components);
      toast.success(`Generated ${components.length} block${components.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate JSON');
    } finally {
      setIsGenerating(false);
    }
  };

  const insertGeneratedBlocks = (mode: 'append' | 'replace') => {
    if (generatedBlocks.length === 0) return;

    dispatch(setBlocks(mode === 'replace' ? generatedBlocks : [...canvasBlocks, ...generatedBlocks]));
    toast.success(mode === 'replace' ? 'Canvas replaced' : 'Blocks inserted');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Prompt</Label>
        <Textarea
          id="ai-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Upload a screenshot and ask: Recreate this image as the same website in the editor. Match the layout, colors, spacing, text, buttons, cards, and sections."
          className="min-h-[180px] resize-none text-sm"
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
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <div>Canvas blocks: {blockCount}</div>
        <div>Selected: {selectedBlock?.type || 'None'}</div>
        <div>Generated blocks: {generatedBlocks.length}</div>
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
            <Button type="button" variant="outline" onClick={() => insertGeneratedBlocks('replace')}>
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
