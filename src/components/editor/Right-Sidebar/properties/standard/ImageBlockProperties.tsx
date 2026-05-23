import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon } from 'lucide-react';

interface ImageContent extends Record<string, unknown> {
  src?: string;
  alt?: string;
  caption?: string;
}

interface ImageBlockPropertiesProps {
  imageContent: ImageContent;
  handleJsonContentChange: <T extends Record<string, unknown>>(content: T, key: keyof T, value: unknown) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => void;
  isUploadingImage: boolean;
}

export const ImageBlockProperties: React.FC<ImageBlockPropertiesProps> = ({
  imageContent,
  handleJsonContentChange,
  handleImageUpload,
  isUploadingImage,
}) => {
  return (
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
            onChange={(e) => handleImageUpload(e, (path: string) => handleJsonContentChange(imageContent, 'src', path))}
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
  );
};
