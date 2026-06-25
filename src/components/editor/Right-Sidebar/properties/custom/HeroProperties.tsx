import React from 'react';
import { Label } from '@/components/ui/label';
import { PropertyInput } from './PropertyInput';
import { PropertyImageInput } from './PropertyImageInput';

interface HeroPropertiesProps {
  type: string;
  content: Record<string, unknown>;
  handleJsonContentChange: (key: string, value: unknown) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => void;
  isUploadingImage: boolean;
}

export const HeroProperties: React.FC<HeroPropertiesProps> = ({
  type,
  content,
  handleJsonContentChange,
  handleImageUpload,
  isUploadingImage,
}) => {
  if (type === 'hero-main' || type === 'hero-centered') {
    return (
      <div className="space-y-4">
        <PropertyImageInput label="Hero Image" value={content.image} onChange={(v) => handleJsonContentChange('image', v)} onUpload={handleImageUpload} isUploading={isUploadingImage} />
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-[11px] font-bold text-primary uppercase">Button Redirects</Label>
          <PropertyInput label="Primary Button URL" value={content.primaryButtonUrl} onChange={(v: string) => handleJsonContentChange('primaryButtonUrl', v)} placeholder="https://..." />
          <PropertyInput label="Secondary Button URL" value={content.secondaryButtonUrl} onChange={(v: string) => handleJsonContentChange('secondaryButtonUrl', v)} placeholder="https://..." />
        </div>
      </div>
    );
  }

  return null;
};
