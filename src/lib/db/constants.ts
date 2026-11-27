/** Shared DB constants — safe to import from client components (no Node/fs). */

export type DbType = 'mongodb' | 'mysql' | 'postgres';

export const DEFAULT_MYSQL_DATABASE_NAME = 'nextcmsmains';
export const DEFAULT_POSTGRES_DATABASE_NAME = 'nextcmsmains';

export type MysqlCredentials = {
  host: string;
  port: number | string;
  user: string;
  password?: string;
  /** Physical MySQL database name (default: nextcmsmains). */
  database?: string;
};

export type PostgresCredentials = {
  host: string;
  port: number | string;
  user: string;
  password?: string;
  /** Physical PostgreSQL database name (default: nextcmsmains). */
  database?: string;
};

export function sanitizeMysqlIdent(name: string, label = 'identifier'): string {
  // Hyphens appear in plugin-scoped tables (e.g. email-plugin_emailconfigs).
  // Safe because callers always quote via qIdent (`...`).
  if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid MySQL ${label}: ${name}`);
  }
  return name;
}

export function sanitizePostgresIdent(name: string, label = 'identifier'): string {
  // Hyphens appear in plugin-scoped tables; callers always quote via qIdent ("...").
  if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid PostgreSQL ${label}: ${name}`);
  }
  return name;
}
