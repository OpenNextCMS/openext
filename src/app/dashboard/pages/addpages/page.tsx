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
                router.push(`/editor`);
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
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                                <h2 className="text-lg font-semibold mb-4">Create a New Page</h2>

                                <label className="block text-sm font-medium text-gray-700">Page Name</label>
                                <input
                                    type="text"
                                    value={pageName}
                                    onChange={handlePageNameChange}
                                    className="w-full p-2 border rounded mb-4"
                                />

                                <label className="block text-sm font-medium text-gray-700">Slug</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={handleSlugChange}
                                    className="w-full p-2 border rounded mb-4"
                                />

                                <button
                                    onClick={handleProceed}
                                    disabled={!pageName || !slug}
                                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
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
