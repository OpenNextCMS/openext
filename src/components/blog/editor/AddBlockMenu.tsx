'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BlogBlockType } from '@/types/index';
import { BLOCK_META, BLOCK_TYPES } from '@/components/blog/blocks/types';

export default function AddBlockMenu({ onAdd }: { onAdd: (type: BlogBlockType) => void }) {
  // Group block types by their declared group for a tidy menu.
  const groups = BLOCK_TYPES.reduce<Record<string, BlogBlockType[]>>((acc, type) => {
    const g = BLOCK_META[type].group;
    (acc[g] ||= []).push(type);
    return acc;
  }, {});

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-96 w-56 overflow-y-auto">
        {Object.entries(groups).map(([group, types], gi) => (
          <div key={group}>
            {gi > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
              {group}
            </DropdownMenuLabel>
            {types.map((type) => (
              <DropdownMenuItem key={type} onClick={() => onAdd(type)} className="cursor-pointer">
                {BLOCK_META[type].label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
