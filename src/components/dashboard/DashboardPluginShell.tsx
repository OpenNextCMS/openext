import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Full-height dashboard plugin workspace. Cancels main padding and fills the
 * scroll container so inner panels can manage their own overflow.
 */
export function DashboardPluginShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('-m-5 flex min-h-0 flex-1 flex-col', className)}>
      {children}
    </div>
  );
}
