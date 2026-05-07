'use client';

import { Pointer, Type, BarChart, ImageIcon, CreditCard, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateBlockContent, updateBlockIcon } from '@/redux/canvasSlice';
import {
  iconOptions,
  renderSelectedIcon,
  type IconLibrary,
} from '@/components/editor/data/iconOptions';

export default function ElementProperties() {
  const dispatch = useAppDispatch();
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);

  const handleContentChange = (newContent: string) => {
    if (!selectedBlock || !selectedBlock.uniqueId) return;
    dispatch(updateBlockContent({ id: selectedBlock.uniqueId, content: newContent }));
  };

  const parseJsonContent = <T,>(fallback: T): T => {
    if (!selectedBlock?.content || !selectedBlock.content.startsWith('{')) return fallback;

    try {
      return { ...fallback, ...JSON.parse(selectedBlock.content) };
    } catch {
      return fallback;
    }
  };

  const handleJsonContentChange = <T extends Record<string, unknown>>(
    currentContent: T,
    key: keyof T,
    value: unknown
  ) => {
    if (!selectedBlock || !selectedBlock.uniqueId) return;
    const updatedContent = { ...currentContent, [key]: value };
    dispatch(
      updateBlockContent({ id: selectedBlock.uniqueId, content: JSON.stringify(updatedContent) })
    );
  };

  const handleStatsChange = (key: 'value' | 'label', newValue: string) => {
    if (!selectedBlock || !selectedBlock.uniqueId) return;
    const currentContent =
      selectedBlock.content && selectedBlock.content.startsWith('{')
        ? JSON.parse(selectedBlock.content)
        : { value: '200+', label: 'Project Delivered' };

    const updatedContent = { ...currentContent, [key]: newValue };
    dispatch(
      updateBlockContent({ id: selectedBlock.uniqueId, content: JSON.stringify(updatedContent) })
    );
  };

  const handleBarColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBlock || selectedBlock.uniqueId === undefined) return;
    const newColor = e.target.value;

    // Parse existing content and provide solid defaults to prevent data loss
    const currentContent =
      selectedBlock.content && selectedBlock.content.startsWith('{')
        ? JSON.parse(selectedBlock.content)
        : { label: selectedBlock.content || 'Delivery Rate', percentage: 100 };

    const updatedContent = {
      label: currentContent.label || 'Delivery Rate',
      percentage: currentContent.percentage ?? 100,
      barColor: newColor,
    };

    dispatch(
      updateBlockContent({ id: selectedBlock.uniqueId, content: JSON.stringify(updatedContent) })
    );
  };

  const handleIconChange = (icon: string) => {
    if (!selectedBlock?.uniqueId) return;
    dispatch(updateBlockIcon({ id: selectedBlock.uniqueId, icon }));
  };

  const isProgressBlock = selectedBlock?.type === 'progress';
  const isTextBlock = selectedBlock?.type === 'text';
  const isStatsBlock = selectedBlock?.type === 'stats';
  const isImageBlock = selectedBlock?.type === 'image';
  const isCardBlock = selectedBlock?.type === 'card';
  const isShapeDividerBlock = selectedBlock?.type === 'shape-divider';
  const supportsIcons =
    selectedBlock?.type === 'text' ||
    selectedBlock?.type === 'button' ||
    selectedBlock?.type === 'icon';
  const selectedIconValue = iconOptions.some((option) => option.value === selectedBlock?.icon)
    ? selectedBlock?.icon
    : 'none';

  const barColor =
    isProgressBlock && selectedBlock?.content && selectedBlock?.content.startsWith('{')
      ? JSON.parse(selectedBlock?.content).barColor || '#22d3ee'
      : '#22d3ee';

  const statsContent =
    isStatsBlock && selectedBlock?.content && selectedBlock?.content.startsWith('{')
      ? JSON.parse(selectedBlock.content)
      : { value: '', label: '' };

  const imageContent = parseJsonContent({
    src: '',
    alt: '',
    caption: '',
  });

  const cardContent = parseJsonContent({
    image: '',
    eyebrow: '',
    title: '',
    body: '',
    buttonText: '',
  });

  const shapeDividerContent = parseJsonContent({
    shape: 'wave',
    color: '#ffffff',
    height: 120,
    flip: false,
  });

  return (
    <div className="rounded-lg border p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Pointer className="h-4 w-4" />
          Element Properties
        </h3>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          Apply to All
        </Button>
      </div>

      <div className="space-y-4">
        {/* Text Block Content */}
        {isTextBlock && (
          <div className="space-y-1.5 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Type className="h-3 w-3" />
              Text Content
            </Label>
            <Textarea
              className="min-h-[100px] text-sm"
              value={selectedBlock?.content || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Enter text content..."
            />
          </div>
        )}

        {/* Stats Block Content */}
        {isStatsBlock && (
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart className="h-3 w-3" />
              Stats Data
            </Label>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Value</Label>
                <Input
                  className="h-8 text-sm"
                  value={statsContent.value}
                  onChange={(e) => handleStatsChange('value', e.target.value)}
                  placeholder="e.g. 200+"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Label</Label>
                <Input
                  className="h-8 text-sm"
                  value={statsContent.label}
                  onChange={(e) => handleStatsChange('label', e.target.value)}
                  placeholder="e.g. Project Delivered"
                />
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar Specific Color */}
        {isProgressBlock && (
          <div className="space-y-1.5 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Progress Bar Color
            </Label>
            <div className="flex gap-2 items-center">
              <div
                className="w-10 h-8 rounded border shadow-sm relative overflow-hidden shrink-0 cursor-pointer"
                style={{ backgroundColor: barColor }}
              >
                <input
                  type="color"
                  value={barColor}
                  onChange={handleBarColorChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <Input
                className="h-8 text-xs font-mono"
                value={barColor}
                onChange={handleBarColorChange}
                placeholder="#000000"
              />
            </div>
          </div>
        )}

        {isImageBlock && (
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-3 w-3" />
              Image Settings
            </Label>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Image URL</Label>
                <Input
                  className="h-8 text-sm"
                  value={imageContent.src}
                  onChange={(e) => handleJsonContentChange(imageContent, 'src', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Alt Text</Label>
                <Input
                  className="h-8 text-sm"
                  value={imageContent.alt}
                  onChange={(e) => handleJsonContentChange(imageContent, 'alt', e.target.value)}
                  placeholder="Describe the image"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Caption</Label>
                <Input
                  className="h-8 text-sm"
                  value={imageContent.caption}
                  onChange={(e) => handleJsonContentChange(imageContent, 'caption', e.target.value)}
                  placeholder="Optional caption"
                />
              </div>
            </div>
          </div>
        )}

        {isCardBlock && (
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              Card Content
            </Label>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Image URL</Label>
                <Input
                  className="h-8 text-sm"
                  value={cardContent.image}
                  onChange={(e) => handleJsonContentChange(cardContent, 'image', e.target.value)}
                  placeholder="https://example.com/card.jpg"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Eyebrow</Label>
                <Input
                  className="h-8 text-sm"
                  value={cardContent.eyebrow}
                  onChange={(e) => handleJsonContentChange(cardContent, 'eyebrow', e.target.value)}
                  placeholder="Small label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Title</Label>
                <Input
                  className="h-8 text-sm"
                  value={cardContent.title}
                  onChange={(e) => handleJsonContentChange(cardContent, 'title', e.target.value)}
                  placeholder="Card title"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Body</Label>
                <Textarea
                  className="min-h-[90px] text-sm"
                  value={cardContent.body}
                  onChange={(e) => handleJsonContentChange(cardContent, 'body', e.target.value)}
                  placeholder="Card description"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Button Text</Label>
                <Input
                  className="h-8 text-sm"
                  value={cardContent.buttonText}
                  onChange={(e) =>
                    handleJsonContentChange(cardContent, 'buttonText', e.target.value)
                  }
                  placeholder="Read More"
                />
              </div>
            </div>
          </div>
        )}

        {isShapeDividerBlock && (
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Waves className="h-3 w-3" />
              Shape Divider
            </Label>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Shape</Label>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={shapeDividerContent.shape}
                  onChange={(e) =>
                    handleJsonContentChange(shapeDividerContent, 'shape', e.target.value)
                  }
                >
                  <option value="wave">Wave</option>
                  <option value="curve">Curve</option>
                  <option value="tilt">Tilt</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={shapeDividerContent.color}
                    onChange={(e) =>
                      handleJsonContentChange(shapeDividerContent, 'color', e.target.value)
                    }
                    className="h-8 w-10 rounded border"
                  />
                  <Input
                    className="h-8 text-xs font-mono"
                    value={shapeDividerContent.color}
                    onChange={(e) =>
                      handleJsonContentChange(shapeDividerContent, 'color', e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Height</Label>
                <Input
                  type="number"
                  min={24}
                  max={320}
                  className="h-8 text-sm"
                  value={shapeDividerContent.height}
                  onChange={(e) =>
                    handleJsonContentChange(shapeDividerContent, 'height', Number(e.target.value))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(shapeDividerContent.flip)}
                  onChange={(e) =>
                    handleJsonContentChange(shapeDividerContent, 'flip', e.target.checked)
                  }
                />
                Flip divider
              </label>
            </div>
          </div>
        )}

        {supportsIcons && (
          <div className="space-y-2 p-3 rounded-md bg-background border shadow-sm">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Icon Packs
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Lucide, Google, and Font Awesome icon sets are available here.
              </p>
            </div>

            <Tabs defaultValue="Lucide" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Lucide">Lucide</TabsTrigger>
                <TabsTrigger value="Google">Google</TabsTrigger>
                <TabsTrigger value="Font Awesome">Font Awesome</TabsTrigger>
              </TabsList>

              {(['Lucide', 'Google', 'Font Awesome'] as IconLibrary[]).map((library) => (
                <TabsContent key={library} value={library} className="mt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {iconOptions
                      .filter((option) => option.library === library)
                      .map((option) => {
                        const isSelected = selectedIconValue === option.value;
                        const previewIcon = renderSelectedIcon(option.value, 'h-4 w-4');

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleIconChange(option.value)}
                            className={`flex flex-col items-center gap-2 rounded-md border p-2 text-[11px] transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                            }`}
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                              {previewIcon || <span className="text-xs">None</span>}
                            </span>
                            <span className="text-center leading-tight">{option.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <div className="flex flex-col gap-1.5 pt-2 border-t">
          <Label htmlFor="element-id" className="text-xs">
            Element ID
          </Label>
          <Input id="element-id" placeholder="Enter element ID" className="h-8 text-sm" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="element-class" className="text-xs">
            CSS Classes
          </Label>
          <Input id="element-class" placeholder="Enter CSS classes" className="h-8 text-sm" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="element-link" className="text-xs">
            Link URL
          </Label>
          <Input id="element-link" placeholder="https://example.com" className="h-8 text-sm" />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="new-tab" className="h-4 w-4" />
          <Label htmlFor="new-tab" className="text-xs">
            Open in new tab
          </Label>
        </div>
      </div>
    </div>
  );
}
