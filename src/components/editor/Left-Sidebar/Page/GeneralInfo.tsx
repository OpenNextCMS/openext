'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  pageId: {
    pageName: string;
    preHeading: string;
    description: string;
  };
}

export default function GeneralInfo({ pageId }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Name
        </Label>
        <Input id="name" type="text" value={pageId.pageName} readOnly className="bg-muted/40" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="preHead" className="text-sm font-medium">
          Pre-Heading
        </Label>
        <Input
          id="preHead"
          type="text"
          value={pageId.preHeading}
          readOnly
          className="bg-muted/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <textarea
          id="description"
          className="min-h-[80px] rounded-md border bg-muted/40 p-3 text-sm"
          value={pageId.description}
          readOnly
        />
      </div>
    </div>
  );
}
