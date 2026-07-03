import type { ReactNode } from 'react';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { hasVerticalHeader } from '@/utils/headerLayout';
import type { BlockData } from '@/types/index';

type SiteChromeLayoutProps = {
  headerBlocks: BlockData[];
  footerBlocks: BlockData[];
  children: ReactNode;
};

export default function SiteChromeLayout({
  headerBlocks,
  footerBlocks,
  children,
}: SiteChromeLayoutProps) {
  const sidebarHeader = hasVerticalHeader(headerBlocks);

  if (sidebarHeader) {
    return (
      <div className="flex min-h-screen rendered-page">
        <aside className="w-64 flex-shrink-0 sticky top-0 self-start h-screen overflow-y-auto">
          {headerBlocks.map((block) => renderFromJson(block))}
        </aside>
        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1">{children}</main>
          {footerBlocks.map((block) => renderFromJson(block))}
        </div>
      </div>
    );
  }

  return (
    <>
      {headerBlocks.length > 0 ? (
        <div className="rendered-page">
          {headerBlocks.map((block) => renderFromJson(block))}
        </div>
      ) : null}
      {children}
      {footerBlocks.length > 0 ? (
        <div className="rendered-page">
          {footerBlocks.map((block) => renderFromJson(block))}
        </div>
      ) : null}
    </>
  );
}
