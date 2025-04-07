'use client';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SelectComp from '../../../ReusableComponents/SelectComp';
import InputSelect from '../../../ReusableComponents/SizeInput';
import { Label } from '@/components/ui/label';

export default function Typography() {
  const [fontOpen, setFontOpen] = useState(false);

  return (
    <Collapsible open={fontOpen} onOpenChange={setFontOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {fontOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Typography</span>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          <SelectComp
            label="Font Family"
            defaultValue="Arial"
            options={[
              { label: 'Arial', value: 'Arial' },
              { label: 'Helvetica', value: 'Helvetica' },
              { label: 'Times New Roman', value: 'Times New Roman' },
              { label: 'Courier New', value: 'Courier New' },
            ]}
          />
          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Font Size</Label>
            <InputSelect
              defaultValue="px"
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
                { label: '%', value: '%' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Line Height</Label>
            <InputSelect
              defaultValue="px"
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
                { label: '%', value: '%' },
              ]}
            />
          </div>
          <SelectComp
            label="Font Weight"
            defaultValue="400"
            options={[
              { label: 'Light (300)', value: '300' },
              { label: 'Regular (400)', value: '400' },
              { label: 'Medium (500)', value: '500' },
              { label: 'Semibold (600)', value: '600' },
              { label: 'Bold (700)', value: '700' },
            ]}
          />
          <SelectComp
            label="Font Style"
            defaultValue="normal"
            options={[
              { label: 'Normal', value: 'normal' },
              { label: 'Italic', value: 'italic' },
            ]}
          />
          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Letter Spacing</Label>
            <InputSelect
              defaultValue="px"
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
              ]}
            />
          </div>
          <SelectComp
            label="Text Align"
            defaultValue="left"
            options={[
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' },
              { label: 'Justify', value: 'justify' },
            ]}
          />
          <SelectComp
            label="Text Transform"
            defaultValue="none"
            options={[
              { label: 'None', value: 'none' },
              { label: 'Capitalize', value: 'capitalize' },
              { label: 'Uppercase', value: 'uppercase' },
              { label: 'Lowercase', value: 'lowercase' },
            ]}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Text Decoration</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                None
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                <span className="underline">Underline</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                <span className="line-through">Strikethrough</span>
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
