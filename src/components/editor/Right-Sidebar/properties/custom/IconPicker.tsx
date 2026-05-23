'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { iconOptions, renderSelectedIcon, type IconLibrary } from '@/components/editor/data/iconOptions';

interface IconPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ label, value, onChange }) => {
  return (
    <div className="space-y-2 p-3 rounded-md bg-background border shadow-sm mt-2">
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label} Icon
        </Label>
      </div>

      <Tabs defaultValue="Lucide" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-7">
          <TabsTrigger value="Lucide" className="text-[9px]">Lucide</TabsTrigger>
          <TabsTrigger value="Google" className="text-[9px]">Google</TabsTrigger>
          <TabsTrigger value="Font Awesome" className="text-[9px]">F.A.</TabsTrigger>
        </TabsList>

        {(['Lucide', 'Google', 'Font Awesome'] as IconLibrary[]).map((library) => (
          <TabsContent key={library} value={library} className="mt-2">
            <div className="grid grid-cols-4 gap-1 max-h-[150px] overflow-y-auto p-1">
              {iconOptions
                .filter((option) => option.library === library)
                .map((option) => {
                  const isSelected = value === option.value;
                  const previewIcon = renderSelectedIcon(option.value, 'h-4 w-4');

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange(option.value)}
                      title={option.label}
                      className={`flex items-center justify-center rounded-md border p-1 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      {previewIcon || <span className="text-[8px]">X</span>}
                    </button>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
