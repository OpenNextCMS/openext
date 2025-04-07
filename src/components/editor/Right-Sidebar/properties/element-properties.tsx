'use client';

import { Pointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ElementProperties() {
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

      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="element-id" className="text-xs">
            Element ID
          </Label>
          <Input id="element-id" placeholder="Enter element ID" className="h-8 text-sm" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="element-class" className="text-xs">
            CSS Classes
          </Label>
          <Input
            id="element-class"
            placeholder="Enter CSS classes"
            className="h-8 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="element-link" className="text-xs">
            Link URL
          </Label>
          <Input
            id="element-link"
            placeholder="https://example.com"
            className="h-8 text-sm"
          />
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
