'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { translations } from '../../../../public/locales/translations';
import Cookies from 'js-cookie';
import { Eye, EyeOff } from 'lucide-react';
import { handleError } from '@/utils/errorHandler'; // Import error and success handlers
import { handleSuccess } from '@/utils/successHandler';

export default function LoginPage() {
  const router = useRouter();
  const [t, setT] = useState(translations.en);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations]);

    const message = Cookies.get('message');
    if (message) {
      handleError(null, message);
      Cookies.remove('message'); // Remove the message cookie after reading it
    }
  }, []);

  const clearAllCookies = async () => {
    const response = await fetch('/api/clear-cookies', {
      method: 'POST',
    });
    if (!response.ok) {
      console.error('Failed to clear cookies');
    }
  };
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'; // Use external backend URL if it exists

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.login.validationError);
      }

      handleSuccess(true, null, 'Login Successful');
      router.push('/dashboard');
    } catch (err) {
      handleError(err, err instanceof Error ? err.message : t.login.generalError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{t.login.title}</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
              {t.login.identifier}
            </label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={credentials.identifier}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t.login.identifierPlaceholder}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t.login.password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t.login.passwordPlaceholder}
                disabled={isLoading}
              />
              <div
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? t.login.loggingIn : t.login.submit}
          </button>
        </form>
      </div>
    </div>
  );
}