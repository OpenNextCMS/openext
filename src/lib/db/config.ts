import { getDynamicEnv } from '@/utils/dynamicEnv';
import {
  DEFAULT_MYSQL_DATABASE_NAME,
  DEFAULT_POSTGRES_DATABASE_NAME,
  sanitizeMysqlIdent,
  sanitizePostgresIdent,
  type DbType,
  type MysqlCredentials,
  type PostgresCredentials,
} from '@/lib/db/constants';

export type { DbType, MysqlCredentials, PostgresCredentials };
export {
  DEFAULT_MYSQL_DATABASE_NAME,
  DEFAULT_POSTGRES_DATABASE_NAME,
  sanitizeMysqlIdent,
  sanitizePostgresIdent,
};

export function getDbType(): DbType {
  const env = getDynamicEnv();
  const raw = String(env.DB_TYPE || '').toLowerCase().trim();
  if (raw === 'mysql') return 'mysql';
  if (raw === 'postgres' || raw === 'postgresql') return 'postgres';
  if (raw === 'mongodb') return 'mongodb';
  if (env.MYSQL_HOST && !env.MONGODB && !env.MONGODB_URI && !env.POSTGRES_HOST) return 'mysql';
  if (env.POSTGRES_HOST && !env.MONGODB && !env.MONGODB_URI && !env.MYSQL_HOST) return 'postgres';
  return 'mongodb';
}

export function isMysql(): boolean {
  return getDbType() === 'mysql';
}

export function isPostgres(): boolean {
  return getDbType() === 'postgres';
}

export function getMysqlConfig() {
  const env = getDynamicEnv();
  return {
    host: env.MYSQL_HOST || '127.0.0.1',
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER || 'root',
    password: env.MYSQL_PASSWORD || '',
  };
}

export function getPostgresConfig() {
  const env = getDynamicEnv();
  return {
    host: env.POSTGRES_HOST || '127.0.0.1',
    port: Number(env.POSTGRES_PORT || 5432),
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || '',
  };
}

/** Resolved CMS database name from credentials override or `.env` MYSQL_DATABASE. */
export function getMysqlDatabaseName(override?: string): string {
  const raw = override != null ? String(override).trim() : '';
  if (raw) return sanitizeMysqlIdent(raw, 'database name');
  const env = getDynamicEnv();
  const fromEnv = String(env.MYSQL_DATABASE || '').trim();
  if (fromEnv) return sanitizeMysqlIdent(fromEnv, 'database name');
  return DEFAULT_MYSQL_DATABASE_NAME;
}

export function resolveMysqlDatabaseName(input?: MysqlCredentials | { database?: string }): string {
  if (input && 'database' in input && input.database) {
    return getMysqlDatabaseName(String(input.database));
  }
  return getMysqlDatabaseName();
}

/** Resolved CMS database name from credentials override or `.env` POSTGRES_DATABASE. */
export function getPostgresDatabaseName(override?: string): string {
  const raw = override != null ? String(override).trim() : '';
  if (raw) return sanitizePostgresIdent(raw, 'database name');
  const env = getDynamicEnv();
  const fromEnv = String(env.POSTGRES_DATABASE || '').trim();
  if (fromEnv) return sanitizePostgresIdent(fromEnv, 'database name');
  return DEFAULT_POSTGRES_DATABASE_NAME;
}

export function resolvePostgresDatabaseName(
  input?: PostgresCredentials | { database?: string }
): string {
  if (input && 'database' in input && input.database) {
    return getPostgresDatabaseName(String(input.database));
  }
  return getPostgresDatabaseName();
}
