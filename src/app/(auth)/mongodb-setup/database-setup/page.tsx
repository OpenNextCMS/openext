'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { translations } from '../../../../../public/locales/translations';
import Cookies from 'js-cookie';

export default function DatabaseSetup() {
  const [userDbName, setUserDbName] = useState('users');
  const [pageDbName, setPageDbName] = useState('pages');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [t, setT] = useState(translations.en);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations]);

    // Load database names from localStorage if they exist
    const savedUserDbName = localStorage.getItem('USER_DB_NAME');
    const savedPageDbName = localStorage.getItem('PAGE_DB_NAME');

    if (savedUserDbName) setUserDbName(savedUserDbName);
    if (savedPageDbName) setPageDbName(savedPageDbName);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    localStorage.setItem('USER_DB_NAME', userDbName);
    localStorage.setItem('PAGE_DB_NAME', pageDbName);

    toast.success('Database setup successful. Redirecting to admin...');
    router.push('/admin');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="space-y-4">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {t.databaseSetup.title}
          </h2>
          <p className="text-center text-sm text-gray-600">
            {t.databaseSetup.configureDatabaseNames}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="masterDb" className="block text-sm font-medium text-gray-700">
                Master Database <span className='text-[12px] font-semibold text-gray-500'> (Mandatory not changable) </span>
              </label>
              <input
                id="masterDb"
                name="masterDb"
                type="text"
                value="master"
                readOnly
                className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-2.5 bg-gray-100 cursor-not-allowed text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="userDbName" className="block text-sm font-medium text-gray-700">
                {t.databaseSetup.userDatabaseName}
              </label>
              <input
                id="userDbName"
                name="userDbName"
                type="text"
                required
                value={userDbName}
                onChange={(e) => setUserDbName(e.target.value)}
                placeholder={t.databaseSetup.enterUserDatabaseName}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pageDbName" className="block text-sm font-medium text-gray-700">
                {t.databaseSetup.pageDatabaseName}
              </label>
              <input
                id="pageDbName"
                name="pageDbName"
                type="text"
                required
                value={pageDbName}
                onChange={(e) => setPageDbName(e.target.value)}
                placeholder={t.databaseSetup.enterPageDatabaseName}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-500  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t.databaseSetup.settingUp : t.databaseSetup.submit}
          </button>
        </form>
      </div>
    </div>
  );
}