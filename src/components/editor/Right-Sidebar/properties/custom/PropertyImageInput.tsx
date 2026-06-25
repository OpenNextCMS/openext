import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PropertyImageInputProps {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => void;
  isUploading: boolean;
  placeholder?: string;
}

export const PropertyImageInput: React.FC<PropertyImageInputProps> = ({
  label,
  value,
  onChange,
  onUpload,
  isUploading,
  placeholder,
}) => {
  const fileInputId = React.useId();

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground uppercase">{label}</Label>
      <div className="space-y-2">
        <Input
          className="h-8 text-sm"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "https://..."}
        />
        <div className="relative">
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            id={fileInputId}
            onChange={(e) => onUpload(e, onChange)}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-[10px] gap-2"
            disabled={isUploading}
            asChild
          >
            <label htmlFor={fileInputId} className="cursor-pointer">
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
};
