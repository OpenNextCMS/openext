'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { Eye, EyeOff, Server, Home, Link as LinkIcon } from 'lucide-react';
import { translations } from '../../../../public/locales/translations';
import Cookies from 'js-cookie';
import { safeStorageGet, safeStorageSet } from '@/utils/safeStorage';

export default function MongoDBSetup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('');
  const [cluster, setCluster] = useState('');
  const [mongoDB, setMongoDB] = useState('compass');
  const [authMech, setAuthMech] = useState('');
  const [authSource, setAuthSource] = useState('');
  const [uri, setUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [t, setT] = useState(translations.en);
  const router = useRouter();
  const [mongoAcc, setMongoAcc] = useState(true);
  const [useUri, setUseUri] = useState(false);
  const [toggle, setToggle] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    cluster: '',
    host: '',
    mongoDB: 'compass',
    authMech: 'Default',
    authSource: '',
  });

  useEffect(() => {
    // Load language settings
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);

    // Load MongoDB credentials from localStorage if they exist
    const savedUsername = safeStorageGet('MONGODB_USERNAME');
    const savedPassword = safeStorageGet('MONGODB_PASSWORD');
    const savedHost = safeStorageGet('MONGODB_HOST');
    const savedCluster = safeStorageGet('MONGODB_CLUSTER');
    const savedMongoDB = safeStorageGet('MONGODB');
    const savedAuthMech = safeStorageGet('MONGODB_AUTH_MECH');
    const savedAuthSource = safeStorageGet('MONGODB_AUTH_SOURCE');
    const savedMongoAcc = safeStorageGet('MONGO_ACC');
    const savedUri = safeStorageGet('MONGODB_URI');
    const savedUseUri = safeStorageGet('USE_URI');

    if (savedUsername) {
      setUsername(savedUsername);
      setFormData((prev) => ({ ...prev, username: savedUsername }));
    }
    if (savedPassword) {
      setPassword(savedPassword);
      setFormData((prev) => ({ ...prev, password: savedPassword }));
    }
    if (savedHost) {
      setHost(savedHost);
      setFormData((prev) => ({ ...prev, host: savedHost }));
    }
    if (savedCluster) {
      setCluster(savedCluster);
      setFormData((prev) => ({ ...prev, cluster: savedCluster }));
    }
    if (savedMongoDB) {
      setMongoDB(savedMongoDB);
      setFormData((prev) => ({ ...prev, mongoDB: savedMongoDB }));
    }
    if (savedAuthMech) {
      setAuthMech(savedAuthMech);
      setFormData((prev) => ({ ...prev, authMech: savedAuthMech }));
    }
    if (savedAuthSource) {
      setAuthSource(savedAuthSource);
      setFormData((prev) => ({ ...prev, authSource: savedAuthSource }));
    }
    if (savedMongoAcc) {
      setMongoAcc(savedMongoAcc === 'true');
    }
    if (savedUri) {
      setUri(savedUri);
    }
    if (savedUseUri === 'true') {
      setUseUri(true);
      setMongoDB('uri');
    }

    // Trigger animation after component mounts
    setTimeout(() => {
      setIsVisible(true);
    }, 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    try {
      // Construct payload based on connection type
      const payload = useUri
        ? { mongoDB: 'uri', uri } // For pasted URI
        : mongoAcc
          ? { username, password, host, mongoDB, authMech, authSource } // For Compass
          : { username, password, host, cluster, mongoDB }; // For Atlas

      const response = await fetch(`${backendUrl}/api/auth/verify-mongodb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || t.mongodbSetup.generalError);
      }

      const data = await response.json().catch(() => {
        throw new SyntaxError(t.mongodbSetup.invalidJsonResponse);
      });

      if (data.success) {
        if (useUri) {
          safeStorageSet('MONGODB', 'uri');
          safeStorageSet('MONGODB_URI', uri);
          safeStorageSet('USE_URI', 'true');
          safeStorageSet('USER_DB_NAME', 'users');
          safeStorageSet('PAGE_DB_NAME', 'pages');

          handleSuccess(
            true,
            null,
            'MongoDB connection successful. Create the first admin user...'
          );
          router.push('/admin');
        } else {
          safeStorageSet('MONGODB_USERNAME', username);
          safeStorageSet('MONGODB_PASSWORD', password);
          safeStorageSet('MONGODB_HOST', host);
          safeStorageSet('MONGODB_CLUSTER', cluster);
          safeStorageSet('MONGODB', mongoDB);
          safeStorageSet('MONGODB_AUTH_MECH', authMech);
          safeStorageSet('MONGODB_AUTH_SOURCE', authSource);
          safeStorageSet('USE_URI', 'false');
          handleSuccess(
            true,
            null,
            'MongoDB connection successful. Redirecting to database setup...'
          );
          router.push('/mongodb-setup/database-setup');
        }
      } else {
        throw new Error(data.message || t.mongodbSetup.generalError);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        handleError(new Error('Invalid response from server'), 'Invalid response from server');
      } else {
        handleError(
          err,
          err instanceof Error
            ? err.message
            : t.mongodbSetup.generalError || 'An unexpected error occurred'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Update the corresponding state variable
    switch (name) {
      case 'username':
        setUsername(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'host':
        setHost(value);
        break;
      case 'cluster':
        setCluster(value);
        break;
      case 'mongoDB':
        setMongoDB(value);
        break;
      case 'authMech':
        setAuthMech(value);
        break;
      case 'authSource':
        setAuthSource(value);
        break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 w-full py-2">
      <div
        className={`w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {/* Title */}
        <div
          className={`transition-opacity duration-500 delay-100 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            {t.mongodbSetup.title}
          </h2>
        </div>
        {/* Connection Type Selector */}
        <div
          className={`flex justify-center mt-4 mb-2 gap-2 transition-opacity duration-500 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <button
            onClick={() => {
              setUseUri(false);
              setMongoAcc(true);
              setMongoDB('compass');
              safeStorageSet('USE_URI', 'false');
              safeStorageSet('MONGO_ACC', 'true');
              safeStorageSet('MONGODB', 'compass');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              !useUri && mongoAcc
                ? 'bg-black text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Home size={18} />
            <span className="text-sm">MongoDB Compass</span>
          </button>
          <button
            onClick={() => {
              setUseUri(false);
              setMongoAcc(false);
              setMongoDB('atlas');
              safeStorageSet('USE_URI', 'false');
              safeStorageSet('MONGO_ACC', 'false');
              safeStorageSet('MONGODB', 'atlas');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              !useUri && !mongoAcc
                ? 'bg-black text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Server size={18} />
            <span className="text-sm">MongoDB Atlas</span>
          </button>
          <button
            onClick={() => {
              setUseUri(true);
              setMongoDB('uri');
              safeStorageSet('USE_URI', 'true');
              safeStorageSet('MONGODB', 'uri');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              useUri
                ? 'bg-black text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LinkIcon size={18} />
            <span className="text-sm">Paste URI</span>
          </button>
        </div>
        {/* Content based on connection type */}
        <div
          className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
        >
          {useUri ? (
            <div
              className={`mt-4 p-6 bg-gray-100 rounded-md transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <h3 className="text-lg font-semibold mb-2">Paste full connection URI</h3>
              <p className="text-xs text-gray-600 mb-4">
                Useful when SRV DNS lookups fail (VPN/firewall). In Atlas → Connect → Drivers →
                select <strong>Node.js 2.2.12 or later</strong> to get a standard <code>mongodb://</code>{' '}
                URI that lists each shard explicitly. The database name in the path will be
                replaced automatically per connection.
              </p>
              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection URI
                </label>
                <textarea
                  name="uri"
                  required
                  rows={4}
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  placeholder="mongodb://user:pass@host1:27017,host2:27017,host3:27017/?ssl=true&replicaSet=...&authSource=admin"
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm font-mono transition-all duration-300"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] mt-4"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t.mongodbSetup.verifying}
                    </div>
                  ) : (
                    t.mongodbSetup.submitButton
                  )}
                </button>
              </form>
            </div>
          ) : mongoAcc ? (
            <div
              className={`mt-4 p-6 bg-gray-100 rounded-md transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <h3 className="text-lg font-semibold mb-4">{t.mongodbSetup.mongodbExample}</h3>
              <div className="bg-white p-4 rounded-md shadow-sm overflow-x-auto">
                <code className="text-sm text-gray-600">
                  <span>mongodb://</span>
                  <span className="text-blue-500">{formData.username || '<username>'}</span>
                  <span>:</span>
                  <span className="text-green-500">
                    {formData.password ? '••••••••' : '<password>'}
                  </span>
                  <span>@</span>
                  <span className="text-red-500">{formData.host || '<hostName>'}</span>
                  <span>/?authMechanism=</span>
                  <span className="text-purple-500">{formData.authMech || '<authMech>'}</span>
                  <span>&authSource=</span>
                  <span className="text-yellow-500">{formData.authSource || '<authSource>'}</span>
                </code>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                  <span>Username</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                  <span>Password</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                  <span>Host</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
                  <span>authMechanism</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                  <span>authSource</span>
                </div>
              </div>
              <p className="text-xs mt-4">
                <strong>Note:</strong> In Host, If Localhost Is Not Working Then Write 127.0.0.1
              </p>
            </div>
          ) : (
            <div>
              <div
                className={`mt-4 p-6 bg-gray-100 rounded-md transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                <h3 className="text-lg font-semibold mb-4">{t.mongodbSetup.mongodbExample}</h3>
                <div className="bg-white p-4 rounded-md shadow-sm overflow-x-auto">
                  <code className="text-sm text-gray-600">
                    <span>mongodb+srv://</span>
                    <span className="text-blue-500">{formData.username || '<username>'}</span>
                    <span>:</span>
                    <span className="text-green-500">
                      {formData.password ? '••••••••' : '<password>'}
                    </span>
                    <span>@</span>
                    <span className="text-purple-500">{formData.cluster || '<clusterName>'}</span>
                    <span>.</span>
                    <span className="text-red-500">{formData.host || '<hostName>'}</span>
                    <span>.mongodb.net/myFirstDatabase?retryWrites=true&w=majority</span>
                  </code>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                    <span>Username</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                    <span>Password</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
                    <span>Cluster</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                    <span>Host</span>
                  </div>
                </div>
                <p className="text-xs mt-4">
                  <strong>Note:</strong> The host is the part after the cluster name and before
                  &quot;.mongodb.net&quot;
                </p>
              </div>
              <div
                className={`flex flex-row items-center my-5 justify-end transition-all duration-500 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                <p className="mx-5 text-lg font-medium text-gray-700">Multiple Cluster?</p>
                <div className="relative inline-flex items-center p-1 rounded-md cursor-pointer">
                  <div className="flex border border-black rounded-md overflow-hidden">
                    <button
                      className={`px-3 py-1 transition-all duration-300 ${
                        toggle ? 'bg-black text-white' : 'bg-transparent text-black'
                      }`}
                      onClick={() => setToggle(true)}
                    >
                      Yes
                    </button>
                    <button
                      className={`px-4 py-1 transition-all duration-300 ${
                        toggle ? 'bg-transparent text-black' : 'bg-black text-white'
                      }`}
                      onClick={() => setToggle(false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {toggle ? (
            <div
              className={`mt-6 transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <h1 className="text-center m-5 text-lg font-medium">In Development</h1>
              <button
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99]"
                onClick={() => setToggle(false)}
              >
                Please use the Single Cluster instead
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {mongoAcc ? (
                <div>
                  <div
                    className={`grid grid-cols-2 gap-4 mt-6 transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        name="username"
                        type="text"
                        required
                        value={formData.username}
                        onChange={handleChange}
                        placeholder={t.mongodbSetup.usernamePlaceholder}
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={handleChange}
                          placeholder={t.mongodbSetup.passwordPlaceholder}
                          className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
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
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                      <input
                        name="host"
                        type="text"
                        required
                        value={formData.host}
                        onChange={handleChange}
                        placeholder={t.mongodbSetup.hostPlaceholder}
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auth Source
                      </label>
                      <input
                        name="authSource"
                        type="text"
                        required
                        value={formData.authSource}
                        onChange={handleChange}
                        placeholder={'Enter authSource'}
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div
                    className={`mt-6 transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auth Mechanism
                      </label>
                      <select
                        name="authMech"
                        value={formData.authMech}
                        onChange={handleChange}
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
                      >
                        <option value="Default">Default</option>
                        <option value="SCRAM-SHA-1">SCRAM-SHA-1</option>
                        <option value="SCRAM-SHA-256">SCRAM-SHA-256</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`grid grid-cols-2 gap-4 mt-6 transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      placeholder={t.mongodbSetup.usernamePlaceholder}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t.mongodbSetup.passwordPlaceholder}
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cluster</label>
                    <input
                      name="cluster"
                      type="text"
                      required
                      value={formData.cluster}
                      onChange={handleChange}
                      placeholder={t.mongodbSetup.clusterPlaceholder}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <input
                      name="host"
                      type="text"
                      required
                      value={formData.host}
                      onChange={handleChange}
                      placeholder={t.mongodbSetup.hostPlaceholder}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm transition-all duration-300"
                    />
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] my-3"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t.mongodbSetup.verifying}
                    </div>
                  ) : (
                    t.mongodbSetup.submitButton
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
