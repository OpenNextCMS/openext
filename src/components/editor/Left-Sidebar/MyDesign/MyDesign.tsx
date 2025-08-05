'use client';

import { Button } from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { ChevronRight, Layout } from 'lucide-react';

export default function MyDesignComponent() {
  return (
    <Collapsible className="rounded-lg border">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Layout className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">My Design</span>
        </div>
      </div>
    </Collapsible>
  );
}
