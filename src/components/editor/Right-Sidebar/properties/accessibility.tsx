'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function Accessibility() {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-3">Accessibility</h3>
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aria-label" className="text-xs">
            ARIA Label
          </Label>
          <Input id="aria-label" placeholder="Describe element purpose" className="h-8 text-sm" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aria-role" className="text-xs">
            ARIA Role
          </Label>
          <select
            id="aria-role"
            className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">None</option>
            <option value="button">Button</option>
            <option value="link">Link</option>
            <option value="heading">Heading</option>
            <option value="img">Image</option>
          </select>
        </div>
      </div>
    </div>
  );
}
