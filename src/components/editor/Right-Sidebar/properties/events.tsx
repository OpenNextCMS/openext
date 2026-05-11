'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateBlockEvents } from '@/redux/canvasSlice';
import SelectComp from '@/components/ReusableComponents/SelectComp';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Events() {
  const dispatch = useAppDispatch();
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);

  const events = selectedBlock?.events || { onClick: 'none', onClickValue: '' };

  const handleEventChange = (value: string) => {
    if (!selectedBlock?.uniqueId) return;
    dispatch(
      updateBlockEvents({
        id: selectedBlock.uniqueId,
        events: { ...events, onClick: value },
      })
    );
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBlock?.uniqueId) return;
    dispatch(
      updateBlockEvents({
        id: selectedBlock.uniqueId,
        events: { ...events, onClickValue: e.target.value },
      })
    );
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-3">Events</h3>
      <div className="space-y-4">
        <SelectComp
          label="On Click"
          value={events.onClick}
          onValueChange={handleEventChange}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Alert', value: 'alert' },
            { label: 'Redirect', value: 'redirect' },
          ]}
        />

        {events.onClick !== 'none' && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              {events.onClick === 'redirect' ? 'Redirect URL' : 'Alert Message'}
            </Label>
            <Input
              value={events.onClickValue || ''}
              onChange={handleValueChange}
              placeholder={
                events.onClick === 'redirect' ? 'https://example.com' : 'Hello World!'
              }
              className="h-8 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
