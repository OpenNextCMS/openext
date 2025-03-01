'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler
import { Eye, EyeOff } from 'lucide-react';
import { translations } from '../../../../public/locales/translations';
import Cookies from 'js-cookie';
import ToggleSwitch from '@/components/vivComp/ToggleSwitch';

export default function MongoDBSetup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('');
  const [cluster, setCluster] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add loading state
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
    setIsLoading(true); // Set loading state to true/api/verify-connection

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'; // Use external backend URL if it exists

    try {
      const response = await fetch(`${backendUrl}/api/auth/verify-mongodb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, host, cluster }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || t.mongodbSetup.generalError);
      }

      const data = await response.json().catch(() => {
        throw new SyntaxError(t.mongodbSetup.invalidJsonResponse);
      });

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
      setIsLoading(false); // Set loading state to false
    }
  };

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    cluster: "",
    host: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [toggle, setToggle] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 w-full py-2">
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">

        {/* Title */}
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">{t.mongodbSetup.title}</h2>
        </div>

        {/* Example */}
        <div className="mt-4 p-6 bg-gray-100 rounded-md">
          <h3 className="text-lg font-semibold mb-4">{t.mongodbSetup.mongodbExample}</h3>
          <div className="bg-white p-4 rounded-md shadow-sm overflow-x-auto">
            <code className="text-sm text-gray-600">
              <span>
                mongodb+srv://</span>
              <span className="text-blue-500">
                {formData.username || "<username>"}
              </span><span>
                :</span>
              <span className="text-green-500">
                {formData.password || "<password>"}
              </span>
              <span>@</span>
              <span className="text-purple-500">
                {formData.cluster || "<clusterName>"}
              </span>
              <span>.</span>
              <span className="text-red-500">
                {formData.host || "<hostName>"}
              </span>
              <span>.mongodb.net/myFirstDatabase?retryWrites=true&w=majority</span>
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

        {/* Switch */}
        <div>
          <div className='flex flex-row items-center m-5 justify-end '>
            <p className='mx-5 text-lg font-medium text-gray-700'>Multiple Cluster?</p>
            <label htmlFor="Toggle3" className="inline-flex items-center p-1 rounded-md cursor-pointer">
              <input id="Toggle3" type="checkbox" className="hidden peer" />

              <span
                className={`px-3 py-1 rounded-l-md border border-black transition-all duration-500 
                  ${toggle ? 'bg-black text-white' : 'bg-transparent text-black'}`}
                onClick={() => setToggle(true)}
              >
                Yes
              </span>

              <span
                className={`px-4 py-1 rounded-r-md border border-black transition-all duration-500 
                  ${toggle ? 'bg-transparent text-black' : 'bg-black text-white'}`}
                onClick={() => setToggle(false)}
              >
                No
              </span>
            </label>
          </div>
        </div>

        {
          toggle ? (
            <div>
              <h1 className='text-center m-5'>In Development</h1>
              <button className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => setToggle(false)}>
                Please use the Single Cluster instead
              </button>
            </div>
          ) : (
            <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <div>
                <input
                  label={t.mongodbSetup.username}
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    handleChange(e);
                  }}
                  placeholder={t.mongodbSetup.usernamePlaceholder}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                />
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleChange(e);
                  }}
                  placeholder={t.mongodbSetup.passwordPlaceholder}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
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
                  onChange={(e) => {
                    setCluster(e.target.value);
                    handleChange(e);
                  }}
                  placeholder={t.mongodbSetup.clusterPlaceholder}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                />
              </div>
              <div>
                <input
                  label={t.mongodbSetup.host}
                  name="host"
                  type="text"
                  required
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    handleChange(e);
                  }}
                  placeholder={t.mongodbSetup.hostPlaceholder}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                />
              </div>
              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={isLoading} // Disable button when loading
                  className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t.mongodbSetup.verifying : t.mongodbSetup.submitButton}
                </button>
              </div>
            </form>
          )
        }



      </div>
    </div>
  );
}

