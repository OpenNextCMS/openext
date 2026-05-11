'use client';

import { useState } from 'react';
import {
  Pointer,
  Type,
  BarChart,
  ImageIcon,
  CreditCard,
  Waves,
  Keyboard,
  CircleDot,
  SquareCheck,
  PanelTop,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  updateBlockContent,
  updateBlockIcon,
  updateSelectedBlockStyles,
} from '@/redux/canvasSlice';
import {
  headerColorPresets,
  matchPreset,
} from '@/app/dashboard/pages/headerColors';
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
  const isInputBlock = selectedBlock?.type === 'input';
  const isChoiceBlock = selectedBlock?.type === 'radio' || selectedBlock?.type === 'checkbox';
  const isImageBlock = selectedBlock?.type === 'image';
  const isCardBlock = selectedBlock?.type === 'card';
  const isNavbarBlock = selectedBlock?.type === 'nav-bar';
  const isShapeDividerBlock = selectedBlock?.type === 'shape-divider';
  const reusableUiBlockTypes = [
    'badge',
    'alert',
    'avatar',
    'separator',
    'skeleton',
    'switch',
    'textarea',
    'table',
    'tabs',
  ];
  const isReusableUiBlock = Boolean(
    selectedBlock?.type && reusableUiBlockTypes.includes(selectedBlock.type)
  );
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

  const defaultInputLabelStyle = {
    color: '#111827',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4',
    marginBottom: '6px',
    textAlign: 'left',
  };
  const inputContent = parseJsonContent({
    label: '',
    placeholder: '',
    name: '',
    inputType: 'text',
    required: false,
    labelStyle: defaultInputLabelStyle,
  });
  const inputLabelStyle = Object.assign({}, defaultInputLabelStyle, inputContent.labelStyle);
  const handleInputLabelStyleChange = (key: string, value: string) => {
    handleJsonContentChange(inputContent, 'labelStyle', {
      ...inputLabelStyle,
      [key]: value,
    });
  };
  const defaultChoiceLabelStyle = {
    color: '#111827',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4',
    marginLeft: '8px',
    textAlign: 'left',
  };
  const choiceContent = parseJsonContent({
    label: '',
    name: '',
    value: '',
    checked: false,
    required: false,
    labelStyle: defaultChoiceLabelStyle,
  });
  const choiceLabelStyle = Object.assign({}, defaultChoiceLabelStyle, choiceContent.labelStyle);
  const handleChoiceLabelStyleChange = (key: string, value: string) => {
    handleJsonContentChange(choiceContent, 'labelStyle', {
      ...choiceLabelStyle,
      [key]: value,
    });
  };
  const choiceBlockLabel = selectedBlock?.type === 'radio' ? 'Radio Button' : 'Check Button';
  const ChoiceIcon = selectedBlock?.type === 'radio' ? CircleDot : SquareCheck;

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

  const navbarContent = parseJsonContent({
    logo: 'Brand',
    logoType: 'text',
    logoImage: '',
    links: [
      { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
      { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
      { label: 'Services', href: '#', onClick: 'none', onClickValue: '' },
      { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
    ],
  });

  const handleNavbarLinkChange = (index: number, key: string, value: string) => {
    const updatedLinks = [...navbarContent.links];
    updatedLinks[index] = { ...updatedLinks[index], [key]: value };
    handleJsonContentChange(navbarContent, 'links', updatedLinks);
  };

  const addNavbarLink = () => {
    const updatedLinks = [...navbarContent.links, { label: 'New Link', href: '#', onClick: 'none', onClickValue: '' }];
    handleJsonContentChange(navbarContent, 'links', updatedLinks);
  };

  const removeNavbarLink = (index: number) => {
    const updatedLinks = navbarContent.links.filter((_: any, i: number) => i !== index);
    handleJsonContentChange(navbarContent, 'links', updatedLinks);
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBlock?.uniqueId) return;

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/editor/background-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.filePath) {
        throw new Error(data.message || 'Upload failed');
      }

      callback(data.filePath);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

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

        {isInputBlock && (
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Keyboard className="h-3 w-3" />
              Input Box Settings
            </Label>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Label</Label>
                <Input
                  className="h-8 text-sm"
                  value={inputContent.label}
                  onChange={(e) => handleJsonContentChange(inputContent, 'label', e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Placeholder</Label>
                <Input
                  className="h-8 text-sm"
                  value={inputContent.placeholder}
                  onChange={(e) =>
                    handleJsonContentChange(inputContent, 'placeholder', e.target.value)
                  }
                  placeholder="Enter your name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Field Name</Label>
                <Input
                  className="h-8 text-sm"
                  value={inputContent.name}
                  onChange={(e) => handleJsonContentChange(inputContent, 'name', e.target.value)}
                  placeholder="your_name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Input Type</Label>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={inputContent.inputType}
                  onChange={(e) =>
                    handleJsonContentChange(inputContent, 'inputType', e.target.value)
                  }
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="tel">Phone</option>
                  <option value="number">Number</option>
                  <option value="url">URL</option>
                  <option value="password">Password</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(inputContent.required)}
                  onChange={(e) =>
                    handleJsonContentChange(inputContent, 'required', e.target.checked)
                  }
                />
                Required field
              </label>
              <div className="space-y-2 border-t pt-3">
                <Label className="text-[10px] text-muted-foreground uppercase">Label Styles</Label>
                <div className="grid grid-cols-[40px_1fr] gap-2 items-center">
                  <input
                    type="color"
                    value={inputLabelStyle.color}
                    onChange={(e) => handleInputLabelStyleChange('color', e.target.value)}
                    className="h-8 w-10 rounded border"
                  />
                  <Input
                    className="h-8 text-xs font-mono"
                    value={inputLabelStyle.color}
                    onChange={(e) => handleInputLabelStyleChange('color', e.target.value)}
                    placeholder="#111827"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Font Size</Label>
                    <Input
                      className="h-8 text-sm"
                      value={inputLabelStyle.fontSize}
                      onChange={(e) => handleInputLabelStyleChange('fontSize', e.target.value)}
                      placeholder="14px"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">
                      Font Weight
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      value={inputLabelStyle.fontWeight}
                      onChange={(e) => handleInputLabelStyleChange('fontWeight', e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">
                      Line Height
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      value={inputLabelStyle.lineHeight}
                      onChange={(e) => handleInputLabelStyleChange('lineHeight', e.target.value)}
                      placeholder="1.4"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">
                      Bottom Gap
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      value={inputLabelStyle.marginBottom}
                      onChange={(e) => handleInputLabelStyleChange('marginBottom', e.target.value)}
                      placeholder="6px"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Text Align</Label>
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={inputLabelStyle.textAlign}
                    onChange={(e) => handleInputLabelStyleChange('textAlign', e.target.value)}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {isChoiceBlock && (
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ChoiceIcon className="h-3 w-3" />
              {choiceBlockLabel} Settings
            </Label>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Label</Label>
                <Input
                  className="h-8 text-sm"
                  value={choiceContent.label}
                  onChange={(e) => handleJsonContentChange(choiceContent, 'label', e.target.value)}
                  placeholder="Option label"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Field Name</Label>
                <Input
                  className="h-8 text-sm"
                  value={choiceContent.name}
                  onChange={(e) => handleJsonContentChange(choiceContent, 'name', e.target.value)}
                  placeholder={selectedBlock?.type === 'radio' ? 'radio_group' : 'agreement'}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Value</Label>
                <Input
                  className="h-8 text-sm"
                  value={choiceContent.value}
                  onChange={(e) => handleJsonContentChange(choiceContent, 'value', e.target.value)}
                  placeholder="option_value"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(choiceContent.checked)}
                  onChange={(e) =>
                    handleJsonContentChange(choiceContent, 'checked', e.target.checked)
                  }
                />
                Checked by default
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(choiceContent.required)}
                  onChange={(e) =>
                    handleJsonContentChange(choiceContent, 'required', e.target.checked)
                  }
                />
                Required field
              </label>
              <div className="space-y-2 border-t pt-3">
                <Label className="text-[10px] text-muted-foreground uppercase">Label Styles</Label>
                <div className="grid grid-cols-[40px_1fr] gap-2 items-center">
                  <input
                    type="color"
                    value={choiceLabelStyle.color}
                    onChange={(e) => handleChoiceLabelStyleChange('color', e.target.value)}
                    className="h-8 w-10 rounded border"
                  />
                  <Input
                    className="h-8 text-xs font-mono"
                    value={choiceLabelStyle.color}
                    onChange={(e) => handleChoiceLabelStyleChange('color', e.target.value)}
                    placeholder="#111827"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Font Size</Label>
                    <Input
                      className="h-8 text-sm"
                      value={choiceLabelStyle.fontSize}
                      onChange={(e) => handleChoiceLabelStyleChange('fontSize', e.target.value)}
                      placeholder="14px"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">
                      Font Weight
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      value={choiceLabelStyle.fontWeight}
                      onChange={(e) => handleChoiceLabelStyleChange('fontWeight', e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">
                      Line Height
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      value={choiceLabelStyle.lineHeight}
                      onChange={(e) => handleChoiceLabelStyleChange('lineHeight', e.target.value)}
                      placeholder="1.4"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Left Gap</Label>
                    <Input
                      className="h-8 text-sm"
                      value={choiceLabelStyle.marginLeft}
                      onChange={(e) => handleChoiceLabelStyleChange('marginLeft', e.target.value)}
                      placeholder="8px"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Text Align</Label>
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={choiceLabelStyle.textAlign}
                    onChange={(e) => handleChoiceLabelStyleChange('textAlign', e.target.value)}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {isReusableUiBlock && (
          <div className="space-y-2 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reusable UI Content
            </Label>
            <Textarea
              className="min-h-[160px] text-xs font-mono"
              value={selectedBlock?.content || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Enter JSON content..."
            />
            <p className="text-[11px] text-muted-foreground">
              This block uses components from src/components/ui. Edit the JSON values here.
            </p>
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
                <Label className="text-[10px] text-muted-foreground uppercase">Upload From System</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="h-8 text-xs"
                  onChange={(e) => handleImageUpload(e, (path) => handleJsonContentChange(imageContent, 'src', path))}
                  disabled={isUploadingImage}
                />
                {isUploadingImage && <p className="text-[10px] text-muted-foreground">Uploading...</p>}
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
                <Label className="text-[10px] text-muted-foreground uppercase">Upload From System</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="h-8 text-xs"
                  onChange={(e) => handleImageUpload(e, (path) => handleJsonContentChange(cardContent, 'image', path))}
                  disabled={isUploadingImage}
                />
                {isUploadingImage && <p className="text-[10px] text-muted-foreground">Uploading...</p>}
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

        {isNavbarBlock && (
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PanelTop className="h-3 w-3" />
              Navbar Settings
            </Label>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Layout</Label>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={navbarContent.layout || 'horizontal'}
                  onChange={(e) =>
                    handleJsonContentChange(navbarContent, 'layout', e.target.value)
                  }
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                  <option value="hamburger">Hamburger</option>
                  <option value="two-line">Two Line</option>
                </select>
              </div>

              {(() => {
                const currentBg =
                  (selectedBlock?.style?.backgroundColor as string) || '#ffffff';
                const currentFg = (selectedBlock?.style?.color as string) || '#111111';
                const currentPreset = matchPreset(currentBg, currentFg);
                return (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] text-muted-foreground uppercase">
                        Color Preset
                      </Label>
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={currentPreset?.id || 'custom'}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id === 'custom') return;
                          const preset = headerColorPresets.find((p) => p.id === id);
                          if (!preset) return;
                          dispatch(
                            updateSelectedBlockStyles({
                              backgroundColor: preset.backgroundColor,
                              color: preset.color,
                            })
                          );
                        }}
                      >
                        {headerColorPresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">
                          Background
                        </Label>
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={currentBg.startsWith('#') ? currentBg : '#ffffff'}
                            onChange={(e) =>
                              dispatch(
                                updateSelectedBlockStyles({ backgroundColor: e.target.value })
                              )
                            }
                            className="h-8 w-10 cursor-pointer rounded border"
                          />
                          <Input
                            className="h-8 text-xs"
                            value={currentBg}
                            onChange={(e) =>
                              dispatch(
                                updateSelectedBlockStyles({ backgroundColor: e.target.value })
                              )
                            }
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">
                          Text
                        </Label>
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={currentFg.startsWith('#') ? currentFg : '#111111'}
                            onChange={(e) =>
                              dispatch(updateSelectedBlockStyles({ color: e.target.value }))
                            }
                            className="h-8 w-10 cursor-pointer rounded border"
                          />
                          <Input
                            className="h-8 text-xs"
                            value={currentFg}
                            onChange={(e) =>
                              dispatch(updateSelectedBlockStyles({ color: e.target.value }))
                            }
                            placeholder="#111111"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Logo Type</Label>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={navbarContent.logoType || 'text'}
                  onChange={(e) => handleJsonContentChange(navbarContent, 'logoType', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                </select>
              </div>

              {navbarContent.logoType === 'image' ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Logo Image URL</Label>
                    <Input
                      className="h-8 text-sm"
                      value={navbarContent.logoImage || ''}
                      onChange={(e) => handleJsonContentChange(navbarContent, 'logoImage', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Upload From System</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      className="h-8 text-xs"
                      onChange={(e) => handleImageUpload(e, (path) => handleJsonContentChange(navbarContent, 'logoImage', path))}
                      disabled={isUploadingImage}
                    />
                    {isUploadingImage && <p className="text-[10px] text-muted-foreground">Uploading...</p>}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Logo Text</Label>
                  <Input
                    className="h-8 text-sm"
                    value={navbarContent.logo}
                    onChange={(e) => handleJsonContentChange(navbarContent, 'logo', e.target.value)}
                    placeholder="Brand Logo"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground uppercase">Nav Links</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={addNavbarLink}
                  >
                    Add Link
                  </Button>
                </div>

                <div className="space-y-3">
                  {navbarContent.links.map((link: any, index: number) => (
                    <div key={index} className="space-y-2 p-2 border rounded bg-muted/10 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 absolute top-1 right-1 text-muted-foreground hover:text-destructive"
                        onClick={() => removeNavbarLink(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-[9px] text-muted-foreground">Label</Label>
                          <Input
                            className="h-7 text-[11px]"
                            value={link.label}
                            onChange={(e) =>
                              handleNavbarLinkChange(index, 'label', e.target.value)
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-[9px] text-muted-foreground">Href</Label>
                          <Input
                            className="h-7 text-[11px]"
                            value={link.href}
                            onChange={(e) => handleNavbarLinkChange(index, 'href', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t pt-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-[9px] text-muted-foreground">On Click</Label>
                          <select
                            className="h-7 rounded border bg-background px-1 text-[10px]"
                            value={link.onClick || 'none'}
                            onChange={(e) => handleNavbarLinkChange(index, 'onClick', e.target.value)}
                          >
                            <option value="none">None</option>
                            <option value="alert">Alert</option>
                            <option value="redirect">Redirect</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-[9px] text-muted-foreground">Value</Label>
                          <Input
                            className="h-7 text-[11px]"
                            value={link.onClickValue || ''}
                            onChange={(e) => handleNavbarLinkChange(index, 'onClickValue', e.target.value)}
                            placeholder="Value..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
