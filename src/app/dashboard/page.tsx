'use client';
import { useEffect, useState } from 'react';
import { translations } from '../../../public/locales/translations';
import Cookies from 'js-cookie';

export default function DashboardPage() {
  const [t, setT] = useState(translations.en);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations]);
  }, []);

  return (
    <div>
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