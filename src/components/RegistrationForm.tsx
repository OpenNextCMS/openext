'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { registerSchema } from '@/modules/auth/authValidation';
import { useRouter } from 'next/navigation';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { Eye, EyeOff } from 'lucide-react';
import { translations } from '../../public/locales/translations';
import Cookies from 'js-cookie';

const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [t, setT] = useState(translations.en);
  const router = useRouter();

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations]);

    const mongodbCredentials = ['MONGODB_USERNAME', 'MONGODB_PASSWORD', 'MONGODB_CLUSTER', 'MONGODB_HOST'];
    const dbInfo = ['USER_DB_NAME', 'PAGE_DB_NAME'];
    const missingCredentials = mongodbCredentials.some((key) => !localStorage.getItem(key));
    const missingDbInfo = dbInfo.some((key) => !localStorage.getItem(key));

    if (missingCredentials || missingDbInfo) {
      router.push('/mongodb-setup');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      siteTitle: formData.get('siteTitle') as string,
      username: formData.get('username') as string,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      phoneNo: formData.get('phoneNo') as string,
    };

    try {
      registerSchema.parse(data);

      const mongodbCredentials = {
        username: localStorage.getItem('MONGODB_USERNAME'),
        password: localStorage.getItem('MONGODB_PASSWORD'),
        host: localStorage.getItem('MONGODB_HOST'),
        cluster: localStorage.getItem('MONGODB_CLUSTER'),
      };

      const userDbName = localStorage.getItem('USER_DB_NAME');
      const pageDbName = localStorage.getItem('PAGE_DB_NAME');

      const setupResponse = await fetch('/api/auth/setup-databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userDbName, pageDbName, mongodbCredentials }),
      });

      const setupData = await setupResponse.json();
      if (!setupResponse.ok) {
        throw new Error(setupData.message || 'An unexpected error occurred');
      }

      if (setupData.success) {
        localStorage.clear();

        const response = await fetch('/api/auth/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Registration failed');

        if (result.success) {
          handleSuccess(true, null, 'Registration successful');
          alert('Please restart the server to complete the setup. Click OK to proceed to login.');
          router.push('/login');
        } else {
          throw new Error(result.message || 'Registration failed');
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else {
        handleError(error, error.message || 'An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-xl flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">{t.register.title}</h2>
          <p className="text-gray-600 text-sm">{t.register.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="siteTitle" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.siteTitle}
              </label>
              <input
                id="siteTitle"
                name="siteTitle"
                placeholder={t.register.siteTitlePlaceholder}
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.siteTitle && <p className="mt-1 text-sm text-red-600">{errors.siteTitle}</p>}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.username}
              </label>
              <input
                id="username"
                name="username"
                placeholder={t.register.usernamePlaceholder}
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.name}
              </label>
              <input
                id="name"
                name="name"
                placeholder={t.register.namePlaceholder}
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder={t.register.emailPlaceholder}
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.password}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.register.passwordPlaceholder}
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  aria-label={t.register.togglePasswordVisibility}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.phoneNo}
              </label>
              <input
                id="phoneNo"
                name="phoneNo"
                placeholder={t.register.phoneNoPlaceholder}
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.phoneNo && <p className="mt-1 text-sm text-red-600">{errors.phoneNo}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t.register.registering : t.register.submit}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;