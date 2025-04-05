'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  pageId: {
    seoName: string;
    seoMeta: string;
  };
}

export default function SeoInfo({ pageId }: Props) {
  return (
    <div className="space-y-5 mt-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="seoName" className="text-sm font-medium">SEO Title</Label>
        <Input id="seoName" type="text" value={pageId.seoName} readOnly className="bg-muted/40" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="seoMeta" className="text-sm font-medium">SEO Description</Label>
        <textarea
          id="seoMeta"
          className="min-h-[80px] rounded-md border bg-muted/40 p-3 text-sm"
          value={pageId.seoMeta}
          readOnly
        />
      </div>
    </div>
  );
}
