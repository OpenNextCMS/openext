'use client';

import { useState } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useAppSelector } from '@/redux/hooks';
import { PreviewCanvas } from './PreviewCanvas';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';
const frameWidth: Record<Breakpoint, string> = {
  desktop: 'w-full',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

/**
 * Live preview panel for the Theme Builder. Reads the draft config + variants
 * straight from the `themeBuilder` Redux slice, so any control change updates it
 * instantly (no refresh). Includes a desktop/tablet/mobile frame switcher.
 */
export function ThemePreview() {
  const draft = useAppSelector((s) => s.themeBuilder.draft);
  const componentVariants = useAppSelector((s) => s.themeBuilder.componentVariants);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  return (
    <div className="space-y-3">
      <div className="flex w-fit items-center gap-1 rounded-lg border p-1">
        {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map((bp) => {
          const Icon = bp === 'desktop' ? Monitor : bp === 'tablet' ? Tablet : Smartphone;
          return (
            <button
              key={bp}
              type="button"
              onClick={() => setBreakpoint(bp)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm capitalize ${
                breakpoint === bp ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" /> {bp}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center rounded-2xl border bg-muted/30 p-4">
        <div className={`${frameWidth[breakpoint]} transition-all`}>
          <div className="overflow-hidden rounded-xl border bg-white">
            <PreviewCanvas config={draft} componentVariants={componentVariants} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemePreview;
