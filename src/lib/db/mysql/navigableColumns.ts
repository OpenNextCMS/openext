/**
 * Stored (real) SQL columns for browsable / indexed fields.
 * Values live in these columns — NOT duplicated inside `doc`.
 * `doc` holds only fields without a dedicated column.
 */

export type NavigableColType = 'string' | 'int' | 'bool' | 'datetime';

export type NavigableColumn = {
  name: string;
  type: NavigableColType;
  /** JSON path inside `doc`, e.g. $.email or $.seo.title */
  path: string;
  length?: number;
  indexed?: boolean;
};

/** Which logical Mongo DB a table was mirrored from (for migration). */
export type MysqlTableSource = 'master' | 'users' | 'pages';

export const MYSQL_TABLE_SOURCE: Record<string, MysqlTableSource> = {
  masterdbs: 'master',
  users: 'users',
  settings: 'users',
  roles: 'users',
  plugins: 'users',
  plugindatas: 'users',
  pluginmigrations: 'users',
  pages: 'pages',
  blogposts: 'pages',
  categories: 'pages',
  tags: 'pages',
  authors: 'pages',
  comments: 'pages',
  analyticsevents: 'pages',
  layouts: 'pages',
  themesettings: 'pages',
  themes: 'pages',
  websitepreferences: 'pages',
  menuredirectmappings: 'pages',
  menuredirectanalytics: 'pages',
  menuredirecthistories: 'pages',
  forms: 'pages',
  formsubmissions: 'pages',
  formversions: 'pages',
  formauditlogs: 'pages',
  theme_engine_themes: 'pages',
  theme_engine_settings: 'pages',
  theme_engine_preview_sessions: 'pages',
};

const s = (name: string, path: string, length = 255, indexed = false): NavigableColumn => ({
  name,
  type: 'string',
  path,
  length,
  indexed,
});

const i = (name: string, path: string, indexed = false): NavigableColumn => ({
  name,
  type: 'int',
  path,
  indexed,
});

const b = (name: string, path: string, indexed = false): NavigableColumn => ({
  name,
  type: 'bool',
  path,
  indexed,
});

const d = (name: string, path: string, indexed = false): NavigableColumn => ({
  name,
  type: 'datetime',
  path,
  indexed,
});

export const NAVIGABLE_COLUMNS: Record<string, NavigableColumn[]> = {
  masterdbs: [s('userDbName', '$.userDbName', 128, true), s('pageDbName', '$.pageDbName', 128, true)],
  users: [
    s('username', '$.username', 191, true),
    s('email', '$.email', 191, true),
    i('role', '$.role', true),
    b('active', '$.active', true),
    s('displayName', '$.displayName', 191),
  ],
  settings: [s('siteTitle', '$.siteTitle', 255, true), s('language', '$.language', 32)],
  roles: [s('name', '$.name', 128, true), i('value', '$.value', true), s('type', '$.type', 32, true)],
  plugins: [
    s('pluginId', '$.pluginId', 128, true),
    s('name', '$.name', 191),
    s('version', '$.version', 64),
    b('isActive', '$.isActive', true),
  ],
  plugindatas: [s('pluginId', '$.pluginId', 128, true), s('key', '$.key', 191, true)],
  pluginmigrations: [s('pluginId', '$.pluginId', 128, true), s('version', '$.version', 64)],
  pages: [
    s('pageName', '$.pageName', 191, true),
    s('slug', '$.slug', 191, true),
    s('locale', '$.locale', 16, true),
    s('translationGroupId', '$.translationGroupId', 64, true),
    s('pageType', '$.pageType', 32, true),
    b('isPublished', '$.isPublished', true),
    b('isHome', '$.isHome', true),
  ],
  blogposts: [
    s('pageName', '$.pageName', 191, true),
    s('slug', '$.slug', 191, true),
    s('locale', '$.locale', 16, true),
    s('translationGroupId', '$.translationGroupId', 64, true),
    s('status', '$.status', 32, true),
    b('isPublished', '$.isPublished', true),
    s('authorName', '$.authorName', 191),
    d('publishedAt', '$.publishedAt', true),
  ],
  categories: [s('name', '$.name', 191, true), s('slug', '$.slug', 191, true)],
  tags: [s('name', '$.name', 191, true), s('slug', '$.slug', 191, true)],
  authors: [s('name', '$.name', 191, true), s('slug', '$.slug', 191, true), s('email', '$.email', 191)],
  comments: [
    s('postId', '$.postId', 64, true),
    s('authorName', '$.authorName', 191),
    s('status', '$.status', 32, true),
  ],
  analyticsevents: [s('event', '$.event', 128, true), s('path', '$.path', 512)],
  layouts: [s('name', '$.name', 191, true), s('slug', '$.slug', 191, true)],
  themesettings: [s('themeId', '$.themeId', 128, true)],
  themes: [s('name', '$.name', 191, true), s('slug', '$.slug', 191, true), b('isActive', '$.isActive', true)],
  websitepreferences: [s('siteName', '$.siteName', 191), s('primaryColor', '$.primaryColor', 64)],
  menuredirectmappings: [
    s('fromPath', '$.fromPath', 512, true),
    s('toPath', '$.toPath', 512),
    b('isActive', '$.isActive', true),
  ],
  menuredirectanalytics: [s('mappingId', '$.mappingId', 64, true)],
  menuredirecthistories: [s('mappingId', '$.mappingId', 64, true), s('action', '$.action', 64)],
  forms: [s('name', '$.name', 191, true), s('slug', '$.slug', 191, true), s('status', '$.status', 32, true)],
  formsubmissions: [s('formId', '$.formId', 64, true), s('status', '$.status', 32, true)],
  formversions: [s('formId', '$.formId', 64, true), i('version', '$.version')],
  formauditlogs: [s('formId', '$.formId', 64, true), s('action', '$.action', 64, true)],
  theme_engine_themes: [s('name', '$.name', 191, true), s('slug', '$.slug', 191, true)],
  theme_engine_settings: [s('themeId', '$.themeId', 128, true)],
  theme_engine_preview_sessions: [s('themeId', '$.themeId', 128, true), s('token', '$.token', 128, true)],
};

export function browseViewName(tableName: string): string {
  return `browse_${tableName}`;
}

/** Regular nullable column DDL (source of truth for mapped fields). */
export function storedColumnDdl(col: NavigableColumn): string {
  switch (col.type) {
    case 'int':
      return `\`${col.name}\` INT NULL`;
    case 'bool':
      return `\`${col.name}\` TINYINT(1) NULL`;
    case 'datetime':
      return `\`${col.name}\` DATETIME(3) NULL`;
    default:
      return `\`${col.name}\` VARCHAR(${col.length || 255}) NULL`;
  }
}

export function indexNameFor(tableName: string, columnName: string): string {
  const raw = `idx_${tableName}_${columnName}`.slice(0, 64);
  return raw.replace(/[^A-Za-z0-9_]/g, '_');
}
