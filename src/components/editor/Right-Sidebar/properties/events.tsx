'use client';

import SelectComp from '../../../ReusableComponents/selectComp';

export default function Events() {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-3">Events</h3>
      <div className="space-y-3">
        <SelectComp
          label="On Click"
          defaultValue="none"
          options={[
            { label: 'None', value: 'none' },
            { label: 'Alert', value: 'alert' },
            { label: 'Redirect', value: 'redirect' },
          ]}
        />
      </div>
    </div>
  );
}
