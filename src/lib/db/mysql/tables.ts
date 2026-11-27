import { DEFAULT_MYSQL_DATABASE_NAME } from '@/lib/db/constants';

export { DEFAULT_MYSQL_DATABASE_NAME };

/** @deprecated Use getMysqlDatabaseName() — reads MYSQL_DATABASE from .env. */
export const MYSQL_DATABASE_NAME = DEFAULT_MYSQL_DATABASE_NAME;

/**
 * Every MongoDB collection used by the CMS, created as a table in the MySQL
 * database chosen at install (MYSQL_DATABASE in .env, default nextcmsmains). * Extra plugin collections are still created on first use.
 *
 * Browse without opening JSON: use views named `browse_<table>`.
 * Mapped fields live in real SQL columns; `doc` stores only unmapped / nested data.
 */
export const MYSQL_CMS_TABLES = [
  // master
  'masterdbs',
  // users
  'users',
  'settings',
  'roles',
  'plugins',
  'plugindatas',
  'pluginmigrations',
  // pages / content
  'pages',
  'blogposts',
  'categories',
  'tags',
  'authors',
  'comments',
  'analyticsevents',
  'layouts',
  'themesettings',
  'themes',
  'websitepreferences',
  // menu redirect
  'menuredirectmappings',
  'menuredirectanalytics',
  'menuredirecthistories',
  // form builder
  'forms',
  'formsubmissions',
  'formversions',
  'formauditlogs',
  // theme engine
  'theme_engine_themes',
  'theme_engine_settings',
  'theme_engine_preview_sessions',
] as const;
