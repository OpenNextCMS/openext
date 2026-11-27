'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Server, Cylinder } from 'lucide-react';
import Cookies from 'js-cookie';
import { translations } from '../../../../public/locales/translations';
import {
  clearMongodbSetupStorage,
  clearMysqlSetupStorage,
  clearPostgresSetupStorage,
  safeStorageGet,
  safeStorageSet,
} from '@/utils/safeStorage';

type Engine = 'mongodb' | 'mysql' | 'postgres';

const copyFor = (t: typeof translations.en) =>
  t.databaseChoice || translations.en.databaseChoice;

const ROUTES: Record<Engine, string> = {
  mongodb: '/mongodb-setup',
  mysql: '/mysql-setup',
  postgres: '/postgres-setup',
};

export default function DatabaseChoicePage() {
  const router = useRouter();
  const [t, setT] = useState(translations.en);
  const [selected, setSelected] = useState<Engine | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);

    const existing = safeStorageGet('DB_TYPE');
    if (existing === 'mongodb' || existing === 'mysql' || existing === 'postgres') {
      setSelected(existing);
    }

    setTimeout(() => setIsVisible(true), 80);
  }, []);

  const handleContinue = () => {
    if (!selected) return;

    if (selected === 'mongodb') {
      clearMysqlSetupStorage();
      clearPostgresSetupStorage();
    } else if (selected === 'mysql') {
      clearMongodbSetupStorage();
      clearPostgresSetupStorage();
    } else {
      clearMongodbSetupStorage();
      clearMysqlSetupStorage();
    }

    safeStorageSet('DB_TYPE', selected);
    router.push(ROUTES[selected]);
  };

  const copy = copyFor(t);

  const cards: Array<{
    id: Engine;
    title: string;
    description: string;
    icon: typeof Database;
  }> = [
    {
      id: 'mongodb',
      title: copy.mongodbTitle,
      description: copy.mongodbDescription,
      icon: Database,
    },
    {
      id: 'mysql',
      title: copy.mysqlTitle,
      description: copy.mysqlDescription,
      icon: Server,
    },
    {
      id: 'postgres',
      title: copy.postgresTitle || 'PostgreSQL',
      description:
        copy.postgresDescription ||
        'Relational database with JSONB document storage and navigable columns. Connect to local or remote Postgres.',
      icon: Cylinder,
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div
        className={`w-full max-w-4xl bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">{copy.title}</h2>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">{copy.subtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map(({ id, title, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`text-left rounded-xl border-2 p-6 transition-all duration-300 ${
                selected === id
                  ? 'border-black bg-gray-50 shadow-md ring-2 ring-black/10'
                  : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-black text-white">
                  <Icon size={22} />
                </span>
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs text-gray-500 leading-relaxed text-center">{copy.lockedNote}</p>

        <button
          type="button"
          disabled={!selected}
          onClick={handleContinue}
          className="mt-6 w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-black border border-black hover:text-black hover:bg-transparent transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copy.continue}
        </button>
      </div>
    </div>
  );
}
