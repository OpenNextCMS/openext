'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler
import { Eye, EyeOff } from 'lucide-react';
import { translations } from '../../../../public/locales/translations';
import Cookies from 'js-cookie';

export default function MongoDBSetup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('');
  const [cluster, setCluster] = useState('');
  // const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState();
  const [t, setT] = useState(translations.en); // Default to English
  const router = useRouter();

  useEffect(() => {
    // Load language settings
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setCurrentLanguage(langFromCookie);
    setT(translations[langFromCookie as keyof typeof translations]);

    // Load MongoDB credentials from localStorage if they exist
    const savedUsername = localStorage.getItem('MONGODB_USERNAME');
    const savedPassword = localStorage.getItem('MONGODB_PASSWORD');
    const savedHost = localStorage.getItem('MONGODB_HOST');
    const savedCluster = localStorage.getItem('MONGODB_CLUSTER');

    if (savedUsername) setUsername(savedUsername);
    if (savedPassword) setPassword(savedPassword);
    if (savedHost) setHost(savedHost);
    if (savedCluster) setCluster(savedCluster);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // setIsLoading(true);

    const mongodbUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/?retryWrites=true&w=majority&appName=${cluster}`;

    try {
      const response = await fetch('/api/auth/verify-mongodb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mongodbUrl }),
      });

      const data = await response.json().catch(() => {
        throw new SyntaxError(t.mongodbSetup.invalidJsonResponse);
      });

      if (!response.ok) {
        throw new Error(data.message || t.mongodbSetup.generalError);
      }

      if (data.success) {
        localStorage.setItem('MONGODB_USERNAME', username);
        localStorage.setItem('MONGODB_PASSWORD', password);
        localStorage.setItem('MONGODB_HOST', host);
        localStorage.setItem('MONGODB_CLUSTER', cluster);
        handleSuccess(true, null, 'MongoDB connection successful. Redirecting to database setup...');
        router.push('/mongodb-setup/database-setup');
      } else {
        throw new Error(data.message || t.mongodbSetup.generalError);
      }
    } catch (err) {
      
      if (err instanceof SyntaxError) {
       
        handleError(new Error('Invalid response from server'), 'Invalid response from server');
      } else {
        handleError(err, err instanceof Error ? err.message : t.mongodbSetup.generalError || 'An unexpected error occurred');
      }
    } finally {
      // setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 w-full py-2">
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">{t.mongodbSetup.title}</h2>
        </div>
        <div className="mt-4 p-6 bg-gray-100 rounded-md">
          <h3 className="text-lg font-semibold mb-4">{t.mongodbSetup.mongodbExample}</h3>
          <div className="bg-white p-4 rounded-md shadow-sm overflow-x-auto">
            <code className="text-sm">
            <span className="text-gray-600">mongodb+srv://</span>
              <span className="text-green-600">username</span>
              <span className="text-gray-600">:</span>
              <span className="text-red-600">&lt;{t.mongodbSetup.dbPassword}&gt;</span>
              <span className="text-gray-600">@</span>
              <span className="text-purple-600">cluster</span>
              <span className="text-gray-600">.</span>
              <span className="text-orange-600">host</span>
              <span className="text-gray-600">.mongodb.net/?retryWrites=true&w=majority</span>
              <span className="text-gray-600">appName=</span>
              <span className="text-purple-600">ClusterName</span>
            </code>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
              <span>Username</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
              <span>Password</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
              <span>Cluster</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
              <span>Host</span>
            </div>
          </div>
          <p className="text-xs mt-4">
            <strong>Note:</strong> The host is the part after the cluster name and before &quot;.mongodb.net&quot;
          </p>
        </div>
        <form className="mt-8 grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div>
            <input
              label={t.mongodbSetup.username}
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.mongodbSetup.usernamePlaceholder}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.mongodbSetup.passwordPlaceholder}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 transition duration-150 ease-in-out"
              aria-label={t.mongodbSetup.togglePasswordVisibility}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div>
            <input
              label={t.mongodbSetup.cluster}
              name="cluster"
              type="text"
              required
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
              placeholder={t.mongodbSetup.clusterPlaceholder}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div>
            <input
              label={t.mongodbSetup.host}
              name="host"
              type="text"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={t.mongodbSetup.hostPlaceholder}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              // isLoading={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
             {t.mongodbSetup.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

