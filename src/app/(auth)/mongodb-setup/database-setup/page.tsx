'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
// import { useLanguage } from '@/app/services/languageService';
// import { translations } from '@/app/locales/translations';

export default function DatabaseSetup() {
  const [userDbName, setUserDbName] = useState('');
  const [pageDbName, setPageDbName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // const { currentLanguage } = useLanguage();

  // const t = translations[currentLanguage.code as keyof typeof translations]?.databaseSetup || translations['en'].databaseSetup;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    localStorage.setItem('USER_DB_NAME', userDbName);
    localStorage.setItem('PAGE_DB_NAME', pageDbName);

    toast.success( 'Database setup successful. Redirecting to admin...', );
    router.push('/admin');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            title
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input
            label="User Database Name"
            name="userDbName"
            type="text"
            required
            value={userDbName}
            onChange={(e) => setUserDbName(e.target.value)}
            placeholder="Enter user database name"
          />
          <input
            label="Page Database Name"
            name="pageDbName"
            type="text"
            required
            value={pageDbName}
            onChange={(e) => setPageDbName(e.target.value)}
            placeholder="Enter page database name"
          />
          <button
            type="submit"
            isLoading={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            submit
          </button>
        </form>
      </div>
    </div>
  );
}
