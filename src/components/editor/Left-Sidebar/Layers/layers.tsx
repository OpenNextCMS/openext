'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';

export default function LayersComponent() {
  const [layersOpen, setLayersOpen] = useState(true);

  return (
    <Collapsible open={layersOpen} onOpenChange={setLayersOpen} className="rounded-lg border mb-3">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {layersOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <Layers className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Layers</span>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 pl-4 py-1 hover:bg-muted rounded-md transition-colors">
            <ChevronRight className="h-4 w-4" />
            <input type="checkbox" className="h-4 w-4" readOnly />
            <span className="text-sm">Body</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
