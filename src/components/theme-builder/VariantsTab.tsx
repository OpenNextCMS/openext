'use client';

import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setVariant } from '@/redux/themeBuilderSlice';
import { listVariantFamilies, getDefaultVariantId } from '@/lib/theme/component-registry';
import { ControlSection } from './controls';
import { cn } from '@/lib/utils';

export function VariantsTab() {
  const dispatch = useAppDispatch();
  const componentVariants = useAppSelector((s) => s.themeBuilder.componentVariants);
  const families = useMemo(() => listVariantFamilies(), []);

  return (
    <ControlSection title="Component variants">
      <div className="space-y-4">
        {families.map((fam) => {
          const current = componentVariants[fam.family] || getDefaultVariantId(fam.family);
          return (
            <div key={fam.family} className="space-y-1.5">
              <p className="text-sm font-medium">{fam.label}</p>
              <div className="flex flex-wrap gap-2">
                {fam.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => dispatch(setVariant({ family: fam.family, variantId: v.id }))}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm transition-colors',
                      current === v.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ControlSection>
  );
}
