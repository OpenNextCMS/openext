'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CustomAttributes() {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-3">Custom Attributes</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-2">
            <Input placeholder="Name" className="h-8 text-sm" />
          </div>
          <div className="col-span-2">
            <Input placeholder="Value" className="h-8 text-sm" />
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Attribute
        </Button>
      </div>
    </div>
  );
}
