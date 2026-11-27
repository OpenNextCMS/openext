'use client';
import { apiUrl } from '@/lib/apiClient';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Cookies from 'js-cookie';
import { translations } from '../../../../public/locales/translations';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { safeStorageGet, safeStorageSet } from '@/utils/safeStorage';
import { DEFAULT_MYSQL_DATABASE_NAME } from '@/lib/db/constants';

const copyFor = (t: typeof translations.en) => t.mysqlSetup || translations.en.mysqlSetup;

const DB_NAME_PATTERN = /^[A-Za-z0-9_]+$/;

export default function MysqlSetupPage() {
  const router = useRouter();
  const [t, setT] = useState(translations.en);
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState(DEFAULT_MYSQL_DATABASE_NAME);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);

    const dbType = safeStorageGet('DB_TYPE');
    if (dbType === 'mongodb') {
      router.replace('/mongodb-setup');
      return;
    }
    if (dbType === 'postgres') {
      router.replace('/postgres-setup');
      return;
    }
    if (dbType !== 'mysql') {
      router.replace('/database-choice');
      return;
    }

    const savedHost = safeStorageGet('MYSQL_HOST');
    const savedPort = safeStorageGet('MYSQL_PORT');
    const savedUser = safeStorageGet('MYSQL_USER');
    const savedPassword = safeStorageGet('MYSQL_PASSWORD');
    const savedDatabase = safeStorageGet('MYSQL_DATABASE');
    if (savedHost) setHost(savedHost);
    if (savedPort) setPort(savedPort);
    if (savedUser) setUser(savedUser);
    if (savedPassword) setPassword(savedPassword);
    if (savedDatabase) setDatabase(savedDatabase);

    setTimeout(() => setIsVisible(true), 80);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const dbName = database.trim() || DEFAULT_MYSQL_DATABASE_NAME;
      if (!DB_NAME_PATTERN.test(dbName)) {
        throw new Error(copyFor(t).databaseInvalid);
      }

      const response = await fetch(apiUrl('/api/auth/verify-mysql'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: Number(port), user, password, database: dbName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || copyFor(t).generalError);
      }

      const data = await response.json().catch(() => {
        throw new SyntaxError('Invalid JSON response');
      });

      if (!data.success) {
        throw new Error(data.message || copyFor(t).generalError);
      }

      safeStorageSet('DB_TYPE', 'mysql');
      safeStorageSet('MYSQL_HOST', host);
      safeStorageSet('MYSQL_PORT', String(port));
      safeStorageSet('MYSQL_USER', user);
      safeStorageSet('MYSQL_PASSWORD', password);
      safeStorageSet('MYSQL_DATABASE', dbName);
      safeStorageSet('USER_DB_NAME', 'users');
      safeStorageSet('PAGE_DB_NAME', 'pages');

      handleSuccess(true, null, copyFor(t).successMessage);
      router.push('/admin');
    } catch (err) {
      handleError(
        err,
        err instanceof Error ? err.message : copyFor(t).generalError
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copy = copyFor(t);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 w-full py-8 px-4">
      <div
        className={`w-full max-w-xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200 transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="text-center space-y-2 mb-8">
          <button
            type="button"
            onClick={() => router.push('/database-choice')}
            className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2"
          >
            {copy.backToChoice}
          </button>
          <h2 className="text-3xl font-extrabold text-gray-900">{copy.title}</h2>
          <p className="text-sm text-gray-600">{copy.subtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="host" className="block text-sm font-medium text-gray-700">
              {copy.host}
            </label>
            <input
              id="host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={copy.hostPlaceholder}
              required
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="port" className="block text-sm font-medium text-gray-700">
              {copy.port}
            </label>
            <input
              id="port"
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder={copy.portPlaceholder}
              required
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="user" className="block text-sm font-medium text-gray-700">
              {copy.user}
            </label>
            <input
              id="user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder={copy.userPlaceholder}
              required
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {copy.password}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={copy.passwordPlaceholder}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="database" className="block text-sm font-medium text-gray-700">
              {copy.database}
            </label>
            <input
              id="database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder={copy.databasePlaceholder}
              required
              pattern="[A-Za-z0-9_]+"
              title={copy.databaseHint}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
            />
            <p className="text-xs text-gray-500">{copy.databaseHint}</p>
          </div>

          <p className="text-xs text-gray-500">{copy.note}</p>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? copy.verifying : copy.submitButton}
          </button>
        </form>
      </div>
    </div>
  );
}
