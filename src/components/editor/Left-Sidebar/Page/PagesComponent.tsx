'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Home, MoreVertical, Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { Page } from '@/types/index';
import { useRouter } from 'next/navigation';

interface PagesComponentProps {
  pages: Page[];
  setPages: (pages: Page[]) => void;
  setPageId: (page: Page) => void;
  setOpenPage: (value: boolean) => void;
}

export default function PagesComponent({
  pages,
  setPages,
  setPageId,
  setOpenPage,
}: PagesComponentProps) {
  const router = useRouter();
  const [pagesOpen, setPagesOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const generateSlug = (name: string): string =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const handlePageNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewPageName(name);
    setNewPageSlug(generateSlug(name));
  };

  const addNewPage = async () => {
    if (newPageName.trim()) {
      const slug = newPageSlug.trim() || generateSlug(newPageName);
      const pageName = newPageName.trim();

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

        // Step 1: Create the page via API
        const response = await fetch(`${backendUrl}/api/pages/add-page`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pageName, slug }),
        });

        if (!response.ok) {
          throw new Error('Failed to create page');
        }

        const result = await response.json();

        const newPage: Page = {
          id: `page-${Date.now()}`,
          pageName,
          preHeading: '',
          description: '',
          seoName: '',
          seoMeta: '',
          slug,
        };

        setPages([...pages, newPage]);
        setNewPageName('');
        setNewPageSlug('');
        setDialogOpen(false);
        toast.success(`Page "${pageName}" created successfully`);

        // Step 2: Redirect to Editor
        router.push(
          `/Editor?pagename=${encodeURIComponent(slug)}&userId=${result.userId}&pageId=${result.data._id}`
        );
      } catch (error) {
        toast.error('Error creating page. Please try again.');
        console.error('Create page error:', error);
      }
    }
  };

  const handleMoreClick = (pageId: string) => {
    setActiveDropdown(activeDropdown === pageId ? null : pageId);
  };

  const handleRename = (page: Page) => {
    console.log('Rename', page);
  };

  const handleDelete = (pageId: string) => {
    setPages(pages.filter((p) => p.id !== pageId));
    toast.success('Page deleted');
  };

  const handleDuplicate = (page: Page) => {
    const newPage = {
      ...page,
      id: `page-${Date.now()}`,
      pageName: `${page.pageName} Copy`,
      slug: `${page.slug}-copy`,
    };
    setPages([...pages, newPage]);
    toast.success('Page duplicated');
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 mb-3 bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setPagesOpen(!pagesOpen)}
        >
          {pagesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <FileText className="h-4 w-4" />
          <span className="font-medium text-sm">Pages</span>
        </div>
        <button
          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition"
          title="Add new page"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Collapsible Content */}
      {pagesOpen && (
        <div className="px-3 pb-2 space-y-1">
          {pages.map((page) => (
            <div
              key={page.id || page._id}
              className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-100 dark:hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-1">
                <span
                  className="truncate text-sm cursor-pointer hover:underline"
                  title="Open page settings"
                  onClick={() => {
                    setOpenPage(true);
                    setPageId(page);
                    const currentParams = new URLSearchParams(window.location.search);
                    const userId = currentParams.get('userId');
                    router.push(`/Editor?pagename=${page.slug}&userId=${userId}&pageId=${page.id}`);
                  }}
                >
                  {page.pageName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {page.isHome === true && (<Home height={16} width={16}/>)}
                <button
                  className="p-1 hover:bg-gray-200 dark:hover:bg-black rounded transition"
                  title="Page settings"
                  onClick={() => {
                    setOpenPage(true);
                    setPageId(page);
                  }}
                >
                  <Settings className="h-4 w-4 text-black dark:text-gray-300" />
                </button>
                <div className="relative">
                  <button
                    className="p-1 hover:bg-gray-200 dark:hover:bg-black rounded transition"
                    title="More options"
                    onClick={() => page.id && handleMoreClick(page.id)}
                  >
                    <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>

                  {activeDropdown === page.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-black border dark:border-gray-600 rounded-md shadow-md z-10">
                      <button
                        onClick={() => handleRename(page)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => page.id && handleDelete(page.id)}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleDuplicate(page)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Duplicate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white rounded-md p-6 w-full max-w-md shadow-lg space-y-4 border border-gray-300 dark:border-black">
            <h2 className="text-lg font-semibold">Add New Page</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label htmlFor="name" className="w-24 text-right text-sm font-medium">
                  Page Name
                </label>
                <input
                  id="name"
                  value={newPageName}
                  onChange={handlePageNameChange}
                  placeholder="Enter page name"
                  className="flex-1 border rounded px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white dark:border-gray-600"
                />
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="slug" className="w-24 text-right text-sm font-medium">
                  Slug
                </label>
                <input
                  id="slug"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder="Enter page slug"
                  className="flex-1 border rounded px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addNewPage}
                className="px-4 py-1 text-sm rounded bg-black text-white hover:bg-muted"
              >
                Add Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
