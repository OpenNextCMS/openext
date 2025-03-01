'use client';
import { useEffect, useState } from 'react';
import { translations } from '../../../public/locales/translations';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';

export default function DashboardPage() {
  const [t, setT] = useState(translations.en);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations]);

    const message = Cookies.get('message');
    if (message) {
      handleError(null, message);
      Cookies.remove('message'); // Remove the message cookie after reading it
    }
  }, []);

  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'; // Use external backend URL if it exists
  const clearAllCookies = async () => {
    const response = await fetch(`${backendUrl}/api/clear-cookies`, {
      method: 'POST',
    });
    if (!response.ok) {
      console.error('Failed to clear cookies');
    }
  };

  useEffect(() => {
    const checkDbAndRedirect = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/verify-connection`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch database connection status: ${errorText}`);
        }
        const data = await response.json();

        if (!data.masterDbConnected || !data.userDbConnected || !data.pageDbConnected) {
          handleError(null, 'Database Connection not Established');
          await clearAllCookies(); // Clear all cookies
          router.push('/language'); // Redirect to /language
        } else {
          // handleSuccess(null, 'Database Connection Established');
        }
      } catch (error) {
        handleError(error, 'Error checking database connections');
        await clearAllCookies(); // Clear all cookies
        router.push('/language'); // Redirect to /language
      }
    };

    checkDbAndRedirect();
  }, [router]);


  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span dangerouslySetInnerHTML={{ __html: error }}></span>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{t.dashboard.welcome}</h1>
        <p className="text-gray-600 mt-2">
          {t.dashboard.selectOption}
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700">{t.dashboard.quickStats}</h3>
          {/* Add stats content here */}
        </div>
        
        {/* Add more cards here */}
      </div>
    </div>
  );
}