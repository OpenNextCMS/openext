'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import SelectComp from '@/components/ReusableComponents/SelectComp';
import { toast } from 'react-hot-toast';

// ✅ RGB to HEX utility
function rgbToHex(rgb: string) {
  const result = rgb.match(/\d+/g);
  if (!result) return '#000000';
  return (
    '#' +
    result
      .slice(0, 3)
      .map((num) => parseInt(num).toString(16).padStart(2, '0'))
      .join('')
  );
}

const Background = () => {
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const dispatch = useAppDispatch();
  const [bgOpen, setBgOpen] = useState(false);
  const [bgOption, setBgOption] = useState('color');
  
  // Color state
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  
  // Gradient state
  const [gradientType, setGradientType] = useState('linear');
  const [gradientColor1, setGradientColor1] = useState('#3b82f6');
  const [gradientColor2, setGradientColor2] = useState('#2dd4bf');
  const [gradientAngle, setGradientAngle] = useState('90');

  // Image state
  const [imageUrl, setImageUrl] = useState('');
  const [bgSize, setBgSize] = useState('cover');
  const [bgPosition, setBgPosition] = useState('center');
  const [bgRepeat, setBgRepeat] = useState('no-repeat');
  const [bgAttachment, setBgAttachment] = useState('scroll');
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlError, setImageUrlError] = useState('');

  const isValidImageUrl = (url: string) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return { valid: true, normalizedUrl: '' };
    }

    try {
      const parsedUrl = new URL(trimmedUrl);
      const pathname = parsedUrl.pathname.toLowerCase();
      const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)$/.test(pathname);

      if (!hasImageExtension) {
        return {
          valid: false,
          normalizedUrl: trimmedUrl,
          message: 'Enter a direct image URL ending in .jpg, .png, .webp, .gif, .svg, .bmp, or .avif',
        };
      }

      return { valid: true, normalizedUrl: trimmedUrl };
    } catch {
      return {
        valid: false,
        normalizedUrl: trimmedUrl,
        message: 'Enter a valid absolute image URL',
      };
    }
  };

  // ✅ Sync from selectedBlock when changed
  useEffect(() => {
    if (!selectedBlock?.style) return;

    const style = selectedBlock.style;

    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      const hex = style.backgroundColor.includes('rgb') ? rgbToHex(style.backgroundColor) : style.backgroundColor;
      setBackgroundColor(hex);
      setBgOption('color');
    }

    if (style.backgroundImage && style.backgroundImage !== 'none') {
      const bgImg = style.backgroundImage;
      if (bgImg.includes('gradient')) {
        setBgOption('gradient');
        const colors = bgImg.match(/#[a-fA-F0-9]{3,6}/g);
        if (colors && colors.length >= 2) {
          setGradientColor1(colors[0]);
          setGradientColor2(colors[1]);
        }
        if (bgImg.includes('linear-gradient')) setGradientType('linear');
        if (bgImg.includes('radial-gradient')) setGradientType('radial');
        
        const angleMatch = bgImg.match(/(\d+)deg/);
        if (angleMatch) setGradientAngle(angleMatch[1]);
      } else if (bgImg.includes('url')) {
        setBgOption('image');
        const urlMatch = bgImg.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch) setImageUrl(urlMatch[1]);
      }
    }

    if (style.backgroundSize) setBgSize(style.backgroundSize as string);
    if (style.backgroundPosition) setBgPosition(style.backgroundPosition as string);
    if (style.backgroundRepeat) setBgRepeat(style.backgroundRepeat as string);
    if (style.backgroundAttachment) setBgAttachment(style.backgroundAttachment as string);

  }, [selectedBlock]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setBackgroundColor(newColor);
    dispatch(updateSelectedBlockStyles({ 
      backgroundColor: newColor,
      backgroundImage: 'none' 
    }));
  };

  const updateGradient = (c1 = gradientColor1, c2 = gradientColor2, angle = gradientAngle, type = gradientType) => {
    const gradientStr = type === 'linear' 
      ? `linear-gradient(${angle}deg, ${c1}, ${c2})`
      : `radial-gradient(circle, ${c1}, ${c2})`;
    
    dispatch(updateSelectedBlockStyles({ 
      backgroundImage: gradientStr,
      backgroundColor: 'transparent'
    }));
  };

  const handleImageChange = (
    url: string,
    size = bgSize,
    pos = bgPosition,
    repeat = bgRepeat,
    attachment = bgAttachment
  ) => {
    dispatch(updateSelectedBlockStyles({
      backgroundImage: url ? `url("${url}")` : 'none',
      backgroundSize: size,
      backgroundPosition: pos,
      backgroundRepeat: repeat,
      backgroundAttachment: attachment,
      backgroundColor: 'transparent'
    }));
  };

  const applyImageUrl = (url: string) => {
    const validation = isValidImageUrl(url);
    setImageUrl(validation.normalizedUrl);

    if (!validation.valid) {
      setImageUrlError(validation.message || 'Invalid image URL');
      return;
    }

    setImageUrlError('');
    handleImageChange(validation.normalizedUrl);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setIsUploading(true);
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

      setImageUrl(data.filePath);
      setImageUrlError('');
      handleImageChange(data.filePath);
      toast.success('Background image uploaded');
    } catch (error) {
      console.error('Background image upload failed:', error);
      toast.error('Failed to upload background image');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Collapsible open={bgOpen} onOpenChange={setBgOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {bgOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Background</span>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3">
          <div className="space-y-4">
            {/* Background Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Background Type</Label>
              <Select value={bgOption} onValueChange={(value) => setBgOption(value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Solid Color</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Solid Color */}
            {bgOption === 'color' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-2 items-center">
                    <div 
                      className="w-10 h-8 rounded border shadow-sm relative overflow-hidden shrink-0 cursor-pointer"
                      style={{ backgroundColor: backgroundColor }}
                    >
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={handleColorChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <Input 
                      className="h-8 text-xs flex-1"
                      value={backgroundColor}
                      onChange={(e) => {
                         setBackgroundColor(e.target.value);
                         dispatch(updateSelectedBlockStyles({ backgroundColor: e.target.value, backgroundImage: 'none' }));
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Gradient */}
            {bgOption === 'gradient' && (
              <div className="space-y-3">
                <SelectComp
                  label="Type"
                  value={gradientType}
                  onValueChange={(v) => { setGradientType(v); updateGradient(gradientColor1, gradientColor2, gradientAngle, v); }}
                  options={[
                    { label: 'Linear', value: 'linear' },
                    { label: 'Radial', value: 'radial' },
                  ]}
                />
                
                {gradientType === 'linear' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Angle (deg)</Label>
                    <Input 
                      type="number"
                      className="h-8 text-xs"
                      value={gradientAngle}
                      onChange={(e) => { setGradientAngle(e.target.value); updateGradient(gradientColor1, gradientColor2, e.target.value); }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color 1</Label>
                    <div className="flex gap-2 items-center">
                      <div 
                        className="w-10 h-8 rounded border shadow-sm relative overflow-hidden shrink-0 cursor-pointer"
                        style={{ backgroundColor: gradientColor1 }}
                      >
                        <input
                          type="color"
                          value={gradientColor1}
                          onChange={(e) => { setGradientColor1(e.target.value); updateGradient(e.target.value, gradientColor2); }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <Input 
                        className="h-8 text-xs flex-1"
                        value={gradientColor1}
                        onChange={(e) => { setGradientColor1(e.target.value); updateGradient(e.target.value, gradientColor2); }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Color 2</Label>
                    <div className="flex gap-2 items-center">
                      <div 
                        className="w-10 h-8 rounded border shadow-sm relative overflow-hidden shrink-0 cursor-pointer"
                        style={{ backgroundColor: gradientColor2 }}
                      >
                        <input
                          type="color"
                          value={gradientColor2}
                          onChange={(e) => { setGradientColor2(e.target.value); updateGradient(gradientColor1, e.target.value); }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <Input 
                        className="h-8 text-xs flex-1"
                        value={gradientColor2}
                        onChange={(e) => { setGradientColor2(e.target.value); updateGradient(gradientColor1, e.target.value); }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Background Image */}
            {bgOption === 'image' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Image URL</Label>
                  <Input 
                    className="h-8 text-xs" 
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (imageUrlError) setImageUrlError('');
                    }}
                    onBlur={(e) => applyImageUrl(e.target.value)}
                  />
                  {imageUrlError && (
                    <p className="text-xs text-red-500">{imageUrlError}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Upload From Device</Label>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="h-8 text-xs"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {isUploading && <p className="text-xs text-muted-foreground">Uploading image...</p>}
                </div>

                {imageUrl && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preview</Label>
                    <div
                      className="h-24 w-full rounded-md border bg-muted"
                      style={{
                        backgroundImage: `url("${imageUrl}")`,
                        backgroundSize: bgSize,
                        backgroundPosition: bgPosition,
                        backgroundRepeat: bgRepeat,
                      }}
                    />
                  </div>
                )}
                
                <SelectComp
                  label="Size"
                  value={bgSize}
                  onValueChange={(v) => { setBgSize(v); handleImageChange(imageUrl, v); }}
                  options={[
                    { label: 'Cover', value: 'cover' },
                    { label: 'Contain', value: 'contain' },
                    { label: 'Auto', value: 'auto' },
                  ]}
                />

                <SelectComp
                  label="Position"
                  value={bgPosition}
                  onValueChange={(v) => { setBgPosition(v); handleImageChange(imageUrl, bgSize, v); }}
                  options={[
                    { label: 'Center', value: 'center' },
                    { label: 'Top', value: 'top' },
                    { label: 'Bottom', value: 'bottom' },
                    { label: 'Left', value: 'left' },
                    { label: 'Right', value: 'right' },
                  ]}
                />

                <SelectComp
                  label="Repeat"
                  value={bgRepeat}
                  onValueChange={(v) => { setBgRepeat(v); handleImageChange(imageUrl, bgSize, bgPosition, v); }}
                  options={[
                    { label: 'No Repeat', value: 'no-repeat' },
                    { label: 'Repeat', value: 'repeat' },
                    { label: 'Repeat X', value: 'repeat-x' },
                    { label: 'Repeat Y', value: 'repeat-y' },
                  ]}
                />

                <SelectComp
                  label="Attachment"
                  value={bgAttachment}
                  onValueChange={(v) => { setBgAttachment(v); handleImageChange(imageUrl, bgSize, bgPosition, bgRepeat, v); }}
                  options={[
                    { label: 'Scroll', value: 'scroll' },
                    { label: 'Fixed', value: 'fixed' },
                    { label: 'Local', value: 'local' },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Background;
