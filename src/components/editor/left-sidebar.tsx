'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { X, Save } from 'lucide-react';
import LayersComponent from './Left-Sidebar/Layers/layers';
import MyDesignComponent from './Left-Sidebar/MyDesign/MyDesign';
import PagesComponent from './Left-Sidebar/Page/PagesComponent';
import GeneralInfo from './Left-Sidebar/Page/GeneralInfo';
import SeoInfo from './Left-Sidebar/Page/SeoInfo';
import { toast } from 'sonner';
import type { Page } from '@/types/index';

export default function LeftSidebar() {
  const searchParams = useSearchParams();
  const pageNameFromUrl = searchParams ? searchParams.get('pagename') : null;
  const userIdFromUrl = searchParams ? searchParams.get('userId') : null;
  const pageIdFromUrl = searchParams ? searchParams.get('pageId') : null;

  const [pages, setPages] = useState<Page[]>([]);
  const [formData, setFormData] = useState<Page | null>(null);
  const [openPage, setOpenPage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const fetchPageById = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/pages/get-pages`);
      if (!response.ok) throw new Error('Failed to fetch pages');
      const data = await response.json();

      if (data?.pages?.length) {
        const transformedPages = data.pages.map((page: Page) => ({
          id: page._id,
          pageName: page.pageName || '',
          preHeading: page.preHeading || '',
          description: page.description || '',
          seoName: page.seoName || '',
          seoMeta: page.seoMeta || '',
          slug: page.slug || '',
          isHome: page.isHome || false,
          isPublished: page.isPublished,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          lastModified: page.lastModified,
        }));

        setPages(transformedPages);

        if (pageNameFromUrl) {
          const foundPage: Page | undefined = transformedPages.find(
            (page: Page) =>
              page.pageName.toLowerCase() === pageNameFromUrl?.toLowerCase() ||
              page.slug?.toLowerCase() === pageNameFromUrl?.toLowerCase()
          );
          if (foundPage) {
            setFormData(foundPage);
            setOpenPage(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  }, [backendUrl, pageNameFromUrl]);

  useEffect(() => {
    fetchPageById();
  }, [fetchPageById]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!formData || !formData.slug || !userIdFromUrl) return;

    try {
      setIsSaving(true);
      const response = await fetch(`${backendUrl}/api/pages/update-page`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: formData.slug,
          isHome: formData.isHome,
          userId: userIdFromUrl,
          pageID: pageIdFromUrl,
          pageName: formData.pageName,
          preHeading: formData.preHeading,
          description: formData.description,
          seoName: formData.seoName,
          seoMeta: formData.seoMeta,
          isPublished: formData.isPublished,
        }),
      });

      if (!response.ok) throw new Error('Failed to update page');
      toast.success('Page updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update page');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black border-r w-full max-w-[300px]">
      {openPage ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Page Settings</h2>
            <button
              onClick={() => setOpenPage(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Close page settings"
            >
              <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {formData && (
              <>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-gray-900 text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    title="Save changes"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <GeneralInfo formData={formData} onChange={handleInputChange} />
                <SeoInfo formData={formData} onChange={handleInputChange} />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Page Builder</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            <PagesComponent
              pages={pages}
              setPages={setPages}
              setPageId={(p) => {
                setFormData(p);
                setOpenPage(true);
              }}
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
