'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import SelectComp from '../../../ReusableComponents/selectComp'; // Update this path as per your structure

const Background = () => {
  const [bgOpen, setBgOpen] = useState(false);
  const [bgOption, setBgOption] = useState('color');

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
          <div className="space-y-3">
            {/* Background Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Background Type</Label>
              <Select defaultValue="color" onValueChange={(value) => setBgOption(value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Background Color */}
            {bgOption === 'color' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2">
                  <Input className="h-8 text-xs flex-1" type="color" />
                </div>
              </div>
            )}

            {/* Gradient */}
            {bgOption === 'gradient' && (
              <SelectComp
                label="Gradient Type"
                defaultValue="linear"
                options={[
                  { label: 'Linear', value: 'linear' },
                  { label: 'Radial', value: 'radial' },
                  { label: 'Conic', value: 'conic' },
                ]}
              />
            )}

            {/* Background Image */}
            {bgOption === 'image' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Image</Label>
                <div className="flex gap-2">
                  <Input className="h-8 text-xs flex-1" placeholder="URL or select file" />
                  <Button variant="outline" className="h-8 text-xs">
                    Browse
                  </Button>
                </div>
                <SelectComp
                  label="Size"
                  defaultValue="cover"
                  options={[
                    { label: 'Cover', value: 'cover' },
                    { label: 'Contain', value: 'contain' },
                    { label: 'Auto', value: 'auto' },
                  ]}
                />
                <SelectComp
                  label="Position"
                  defaultValue="center"
                  options={[
                    { label: 'Center', value: 'center' },
                    { label: 'Top Left', value: 'top-left' },
                    { label: 'Top Right', value: 'top-right' },
                    { label: 'Bottom Left', value: 'bottom-left' },
                    { label: 'Bottom Right', value: 'bottom-right' },
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
