import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Type } from 'lucide-react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockEvents } from '@/redux/canvasSlice';

export const TextBlockProperties = ({ selectedBlock, handleContentChange, availablePages }: any) => {
  const dispatch = useAppDispatch();
  const isLinked = selectedBlock?.events?.onClick === 'redirect';
  const currentHref = (selectedBlock?.events?.onClickValue as string) || '';

  const setHref = (value: string) => {
    if (!selectedBlock?.uniqueId) return;
    if (!value) {
      dispatch(
        updateBlockEvents({
          id: selectedBlock.uniqueId,
          events: { onClick: 'none', onClickValue: '' },
        })
      );
      return;
    }
    dispatch(
      updateBlockEvents({
        id: selectedBlock.uniqueId,
        events: { onClick: 'redirect', onClickValue: value },
      })
    );
  };

  return (
    <>
      <div className="space-y-1.5 p-3 rounded-md bg-background border shadow-sm">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Type className="h-3 w-3" />
          Text Content
        </Label>
        <Textarea
          className="min-h-[100px] text-sm"
          value={selectedBlock?.content || ''}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Enter text content..."
        />
      </div>

      <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Type className="h-3 w-3" />
          Link
        </Label>
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Href</Label>
            <Input
              className="h-8 text-sm"
              value={currentHref}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/about or https://example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Link to page</Label>
            <select
              className="h-8 rounded border bg-background px-2 text-sm"
              value=""
              onChange={(e) => {
                const slug = e.target.value;
                if (!slug) return;
                setHref(`/${slug}`);
              }}
            >
              <option value="">
                {availablePages.length === 0 ? 'No pages found' : 'Pick a page…'}
              </option>
              {availablePages.map((p: any) => (
                <option key={p.slug} value={p.slug}>{p.pageName} (/{p.slug})</option>
              ))}
            </select>
          </div>
          {isLinked && (
            <p className="text-[10px] text-muted-foreground">
              Click on the rendered page will navigate to{' '}
              <code className="bg-muted px-1 rounded">{currentHref}</code>.
            </p>
          )}
        </div>
      </div>
    </>
  );
};
