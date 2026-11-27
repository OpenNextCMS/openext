'use client';
import { apiUrl } from '@/lib/apiClient';

import { useState, useEffect } from 'react';
import { ZodError } from 'zod';
import { registerSchema } from '@/modules/auth/authValidation';
import { useRouter } from 'next/navigation';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { Eye, EyeOff } from 'lucide-react';
import { translations } from '../../public/locales/translations';
import Cookies from 'js-cookie';
import defaultData from '@/app/themes/openNextDefault/public/data/default.json';
import { safeStorageClear, safeStorageGet } from '@/utils/safeStorage';
import { DEFAULT_MYSQL_DATABASE_NAME, DEFAULT_POSTGRES_DATABASE_NAME } from '@/lib/db/constants';


const NewRegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [t, setT] = useState(translations.en);
  const router = useRouter();

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);

    const dbType = safeStorageGet('DB_TYPE');
    const dbInfo = ['USER_DB_NAME', 'PAGE_DB_NAME'];
    const missingDbInfo = dbInfo.some((key) => !safeStorageGet(key));

    if (dbType === 'mysql') {
      const mysqlCredentials = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER'];
      const missingMysql = mysqlCredentials.some((key) => !safeStorageGet(key));
      if (missingMysql || missingDbInfo) {
        router.push('/mysql-setup');
      }
      return;
    }

    if (dbType === 'postgres') {
      const postgresCredentials = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER'];
      const missingPostgres = postgresCredentials.some((key) => !safeStorageGet(key));
      if (missingPostgres || missingDbInfo) {
        router.push('/postgres-setup');
      }
      return;
    }

    const mongoDB = safeStorageGet('MONGODB');
    let missingCredentials = false;

    if (mongoDB === 'atlas') {
      const atlasCredentials = [
        'MONGODB_USERNAME',
        'MONGODB_PASSWORD',
        'MONGODB_HOST',
        'MONGODB_CLUSTER',
        'MONGODB',
      ];
      missingCredentials = atlasCredentials.some((key) => !safeStorageGet(key));
    } else if (mongoDB === 'compass') {
      const compassCredentials = [
        'MONGODB_USERNAME',
        'MONGODB_PASSWORD',
        'MONGODB_HOST',
        'MONGODB_AUTH_MECH',
        'MONGODB_AUTH_SOURCE',
        'MONGODB',
      ];
      missingCredentials = compassCredentials.some((key) => !safeStorageGet(key));
    } else if (mongoDB === 'uri') {
      const uriCredentials = ['MONGODB_URI', 'MONGODB'];
      missingCredentials = uriCredentials.some((key) => !safeStorageGet(key));
    } else {
      missingCredentials = true;
    }

    if (missingCredentials || missingDbInfo || dbType !== 'mongodb') {
      router.push(dbType === 'mongodb' ? '/mongodb-setup' : '/database-choice');
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
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      phoneNo: formData.get('phoneNo') as string,
      role: 'SuperAdmin', // updated default role to SuperAdmin (value 0)
    };

    try {
      registerSchema.parse(data);

      const storedDbType = safeStorageGet('DB_TYPE');
      const dbType =
        storedDbType === 'mysql' || storedDbType === 'postgres' ? storedDbType : 'mongodb';
      const mongodbCredentials = (() => {
        if (dbType !== 'mongodb') return {};
        const mongoDB = safeStorageGet('MONGODB');
        if (mongoDB === 'atlas') {
          return {
            username: safeStorageGet('MONGODB_USERNAME'),
            password: safeStorageGet('MONGODB_PASSWORD'),
            host: safeStorageGet('MONGODB_HOST'),
            cluster: safeStorageGet('MONGODB_CLUSTER'),
            mongoDB: safeStorageGet('MONGODB'),
          };
        } else if (mongoDB === 'compass') {
          return {
            username: safeStorageGet('MONGODB_USERNAME'),
            password: safeStorageGet('MONGODB_PASSWORD'),
            host: safeStorageGet('MONGODB_HOST'),
            authMech: safeStorageGet('MONGODB_AUTH_MECH'),
            authSource: safeStorageGet('MONGODB_AUTH_SOURCE'),
            mongoDB: safeStorageGet('MONGODB'),
          };
        } else if (mongoDB === 'uri') {
          return {
            uri: safeStorageGet('MONGODB_URI'),
            mongoDB: safeStorageGet('MONGODB'),
          };
        }
        return {};
      })();

      const mysqlCredentials =
        dbType === 'mysql'
          ? {
              host: safeStorageGet('MYSQL_HOST'),
              port: Number(safeStorageGet('MYSQL_PORT') || 3306),
              user: safeStorageGet('MYSQL_USER'),
              password: safeStorageGet('MYSQL_PASSWORD') || '',
              database: safeStorageGet('MYSQL_DATABASE') || DEFAULT_MYSQL_DATABASE_NAME,
            }
          : undefined;

      const postgresCredentials =
        dbType === 'postgres'
          ? {
              host: safeStorageGet('POSTGRES_HOST'),
              port: Number(safeStorageGet('POSTGRES_PORT') || 5432),
              user: safeStorageGet('POSTGRES_USER'),
              password: safeStorageGet('POSTGRES_PASSWORD') || '',
              database: safeStorageGet('POSTGRES_DATABASE') || DEFAULT_POSTGRES_DATABASE_NAME,
            }
          : undefined;

      const userDbName = safeStorageGet('USER_DB_NAME');
      const pageDbName = safeStorageGet('PAGE_DB_NAME');

      const setupResponse = await fetch(apiUrl(`/api/auth/setup-databases`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbType,
          userDbName,
          pageDbName,
          mongodbCredentials,
          mysqlCredentials,
          postgresCredentials,
        }),
      });

      const setupData = await setupResponse.json();
      if (!setupResponse.ok) {
        throw new Error(setupData.message || 'An unexpected error occurred');
      }

      if (setupData.success) {
        fetch(apiUrl(`/api/auth/admin`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            dbType,
            userDbName,
            pageDbName,
            mongodbCredentials,
            mysqlCredentials,
            postgresCredentials,
            // Page.component is BlockData[]; wrap the single root from default.json
            defaultData: Array.isArray(defaultData) ? defaultData : [defaultData],
          }),
        })
          .then((response) => response.json())
          .then((result) => {
            if (!result.success) throw new Error(result.message || 'Registration failed');

            handleSuccess(true, null, 'Registration successful.');
            safeStorageClear();
            router.push('/login');
          })
          .catch((error) => {
            handleError(error, error.message || 'An unexpected error occurred');
          });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else {
        handleError(error, (error as Error).message || 'An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-4 px-4 sm:px-6 lg:px-8">
      <div className="w-max space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">{t.register.title}</h2>
          <p className="text-gray-600 text-sm">{t.register.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* SiteTite */}
            <div>
              <label htmlFor="siteTitle" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.siteTitle}
              </label>
              <input
                id="siteTitle"
                name="siteTitle"
                placeholder={t.register.siteTitlePlaceholder}
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
              />
              {errors.siteTitle && <p className="mt-1 text-sm text-red-600">{errors.siteTitle}</p>}
            </div>

            {/* Email */}
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
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            <div className="flex gap-6">
              {/* UserName */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  {t.register.username}
                </label>
                <input
                  id="username"
                  name="username"
                  placeholder={t.register.usernamePlaceholder}
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                />
                {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t.register.password}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.register.passwordPlaceholder}
                    required
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm pr-10"
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
            </div>

            {/* PhoneNo */}
            <div>
              <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.phoneNo}
              </label>
              <input
                id="phoneNo"
                name="phoneNo"
                placeholder={t.register.phoneNoPlaceholder}
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
              />
              {errors.phoneNo && <p className="mt-1 text-sm text-red-600">{errors.phoneNo}</p>}
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                {t.register.role}
              </label>
              <input
                id="role"
                name="role"
                value="SuperAdmin" // default role, which seeds to value 0 in DB
                readOnly
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 rounded-lg bg-black shadow-sm text-sm font-medium text-white black border border-black hover:text-black hover:bg-transparent transition-all duration-500  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t.register.registering : t.register.submit}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewRegisterForm;
