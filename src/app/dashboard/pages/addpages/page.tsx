'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';

export default function Page() {
  const [pageName, setPageName] = useState('');
  const [slug, setSlug] = useState('');
  const isModalOpen = true;
  const router = useRouter();

  const handlePageNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPageName(value);
    setSlug(value.toLowerCase().replace(/\s+/g, '-'));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
  };

  const handleProceed = async () => {
    if (!pageName || !slug) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

      // Step 1: Create the page
      const response = await fetch(`${backendUrl}/api/pages/add-page`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageName, slug }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Step 2: Get pages and userId
        const getResponse = await fetch(`${backendUrl}/api/pages/get-pages`, {
          method: 'GET',
          credentials: 'include',
        });

        const getData = await getResponse.json();

        if (getResponse.ok && getData.userId) {
          const userId = getData.userId;
          // Step 3: Redirect with page info
          router.push(`/Editor?pagename=${encodeURIComponent(slug)}&userId=${userId}`);
        } else {
          console.error('Failed to fetch user/pages:', getData.message || getData.error);
        }
      } else {
        console.error('Page creation failed:', result.message);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  };

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {isModalOpen && (
           <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-0">
           <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-2xl max-w-md w-full">
             <h2 className="text-xl font-bold text-black dark:text-white mb-6">Create a New Page</h2>
         
             <label className="block text-sm font-medium text-gray-800 dark:text-white mb-1">Page Name</label>
             <input
               type="text"
               value={pageName}
               onChange={handlePageNameChange}
               className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-black dark:text-white mb-5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
             />
         
             <label className="block text-sm font-medium text-gray-800 dark:text-white mb-1">Slug</label>
             <input
               type="text"
               value={slug}
               onChange={handleSlugChange}
               className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-black dark:text-white mb-6 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
             />
         
             <button
               onClick={handleProceed}
               disabled={!pageName || !slug}
               className="w-full px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-semibold rounded hover:opacity-90 disabled:opacity-50 transition"
             >
               Proceed to Editor
             </button>
           </div>
         </div>         
          )}
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
