import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard } from 'lucide-react';
import { PropertyImageInput } from '../custom/PropertyImageInput';

interface CardContent extends Record<string, unknown> {
  image?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  buttonText?: string;
}

interface CardBlockPropertiesProps {
  cardContent: CardContent;
  handleJsonContentChange: <T extends Record<string, unknown>>(content: T, key: keyof T, value: unknown) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => void;
  isUploadingImage: boolean;
}

export const CardBlockProperties: React.FC<CardBlockPropertiesProps> = ({
  cardContent,
  handleJsonContentChange,
  handleImageUpload,
  isUploadingImage,
}) => {
  return (
    <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <CreditCard className="h-3 w-3" />
        Card Content
      </Label>
      <div className="space-y-4">
        <PropertyImageInput 
          label="Card Image" 
          value={cardContent.image} 
          onChange={(v) => handleJsonContentChange(cardContent, 'image', v)} 
          onUpload={handleImageUpload} 
          isUploading={isUploadingImage} 
          placeholder="https://example.com/card.jpg"
        />
        
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
            onChange={(e) => handleJsonContentChange(cardContent, 'buttonText', e.target.value)}
            placeholder="Read More"
          />
        </div>
      </div>
    </div>
  );
};
