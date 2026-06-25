import React from 'react';
import { PropertyInput } from './PropertyInput';
import { Label } from '@/components/ui/label';

interface ContactPropertiesProps {
  type: string;
  content: { mapUrl?: string } & Record<string, unknown>;
  handleJsonContentChange: (key: string, value: unknown) => void;
}

export const ContactProperties: React.FC<ContactPropertiesProps> = ({
  type,
  content,
  handleJsonContentChange,
}) => {
  if (type === 'contact') {
    return (
      <div className="space-y-4">
        <div className="space-y-4 pt-2 border-t">
          <Label className="text-[11px] font-bold text-primary uppercase">Map</Label>
          <PropertyInput label="Google Maps URL" value={content.mapUrl} onChange={(v: string) => handleJsonContentChange('mapUrl', v)} placeholder="https://maps.google.com/..." />
        </div>
        <div className="text-center p-4">
          <Label className="text-xs italic text-muted-foreground">Edit text on canvas. Edit styles in Style tab.</Label>
        </div>
      </div>
    );
  }

  if (type === 'contact-simple') {
    return (
      <div className="space-y-4 text-center p-4">
        <Label className="text-xs italic text-muted-foreground">Edit text on canvas. Edit styles in Style tab.</Label>
      </div>
    );
  }

  return null;
};
