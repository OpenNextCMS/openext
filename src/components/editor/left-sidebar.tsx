'use client';

import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LayersComponent from './Left-Sidebar/Layers/layers';
import MyDesignComponent from './Left-Sidebar/MyDesign/MyDesign';
import PagesComponent from './Left-Sidebar/Page/PagesComponent';
import GeneralInfo from './Left-Sidebar/Page/GeneralInfo';
import SeoInfo from './Left-Sidebar/Page/SeoInfo';
import type { Page } from '@/types/index';


export default function LeftSidebar() {
  const searchParams = useSearchParams();
  const pageIdFromUrl = searchParams ? searchParams.get('pageId') : null;

  const [pages, setPages] = useState<Page[]>([
    {
      id: 'home',
      pageName: 'Home',
      preHeading: 'Welcome',
      description: 'This is a default page',
      seoName: 'OpenNext',
      seoMeta: 'OpenNext is a new CMS type Website.',
    },
  ]);

  const [pageId, setPageId] = useState<Page>({
    id: 'home',
    pageName: 'Home',
    preHeading: 'Welcome',
    description: 'This is a default page',
    seoName: 'OpenNext',
    seoMeta: 'OpenNext is a new CMS type Website.',
  });

  const [openPage, setOpenPage] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const fetchPageById = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/pages/get-pages`);
      if (!response.ok) throw new Error('Failed to fetch pages');
      const data = await response.json();
      setPages(data || []);
    } catch {
      toast.error('Failed to load pages');
    }
  }, [backendUrl]);

  useEffect(() => {
    if (pageIdFromUrl) {
      fetchPageById();
    }
  }, [pageIdFromUrl, fetchPageById]);

  return (
    <div className="flex h-full flex-col bg-background">
      {openPage ? (
        <div className="p-4">
          {pageId && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Page Settings</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenPage(false)}
                        className="hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Close page settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <GeneralInfo pageId={pageId} />
              <SeoInfo pageId={pageId} />
            </>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Page Builder</h2>
          </div>

          <div className="p-2">
            <PagesComponent
              pages={pages}
              setPages={setPages}
              setPageId={setPageId}
              setOpenPage={setOpenPage}
            />

            <LayersComponent />
            <MyDesignComponent />
          </div>
        </div>
      )}
    </div>
  );
}
