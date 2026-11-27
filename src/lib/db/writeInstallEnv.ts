import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { MysqlCredentials, PostgresCredentials } from '@/lib/db/constants';
import {
  DEFAULT_MYSQL_DATABASE_NAME,
  DEFAULT_POSTGRES_DATABASE_NAME,
} from '@/lib/db/constants';

const ENV_PATH = () => path.join(process.cwd(), '.env');

function envValue(value: string | number | undefined): string {
  const raw = value == null ? '' : String(value);
  if (raw === '') return '';
  if (/[\s#"'$`\\]/.test(raw)) return JSON.stringify(raw);
  return raw;
}

const COMMON_TAIL = (userDbName: string, pageDbName: string, jwtSecret: string) => `
USER_DB_NAME=${envValue(userDbName)}
PAGE_DB_NAME=${envValue(pageDbName)}
isRegistration=true
dbConnection=true
NEXT_PUBLIC_needsRestart=false
DEFAULT_HOME_SLUG=default_home
WEB_ACCESS_KEY=allowMe
JWT_SECRET=${jwtSecret}
`.trim();

export async function writeMongodbInstallEnv(params: {
  userDbName: string;
  pageDbName: string;
  mongoDB: string;
  uri?: string;
  username?: string;
  password?: string;
  host?: string;
  cluster?: string;
  authMech?: string;
  authSource?: string;
  /** Preserve existing JWT when switching engines so sessions stay valid. */
  jwtSecret?: string;
}): Promise<void> {
  const jwtSecret = params.jwtSecret || crypto.randomBytes(32).toString('hex');
  const tail = COMMON_TAIL(params.userDbName, params.pageDbName, jwtSecret);
  let credentials = '';

  if (params.mongoDB === 'uri') {
    credentials = `MONGODB_URI=${envValue(params.uri)}
MONGODB=${params.mongoDB}`;
  } else if (params.mongoDB === 'atlas') {
    credentials = `MONGODB_USERNAME=${envValue(params.username)}
MONGODB_PASSWORD=${envValue(params.password)}
MONGODB_HOST=${envValue(params.host)}
MONGODB_CLUSTER=${envValue(params.cluster)}
MONGODB=${params.mongoDB}`;
  } else if (params.mongoDB === 'compass') {
    credentials = `MONGODB_USERNAME=${envValue(params.username)}
MONGODB_PASSWORD=${envValue(params.password)}
MONGODB_HOST=${envValue(params.host)}
MONGODB_AUTH_MECH=${envValue(params.authMech)}
MONGODB_AUTH_SOURCE=${envValue(params.authSource)}
MONGODB=${params.mongoDB}`;
  } else {
    throw new Error('Invalid MongoDB type');
  }

  const envContent = `
# NEXT CMS UNCOMMENT BELOW FOR EXTERNAL BACKEND USE (External APIs only)
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3012
DB_TYPE=mongodb
${credentials}
${tail}
`.trim();

  await fs.writeFile(ENV_PATH(), envContent, { flag: 'w' });
}

export async function writeMysqlInstallEnv(params: {
  userDbName: string;
  pageDbName: string;
  mysql: MysqlCredentials;
  /** Preserve existing JWT when switching engines so sessions stay valid. */
  jwtSecret?: string;
}): Promise<void> {
  const jwtSecret = params.jwtSecret || crypto.randomBytes(32).toString('hex');
  const tail = COMMON_TAIL(params.userDbName, params.pageDbName, jwtSecret);
  const envContent = `
# NEXT CMS UNCOMMENT BELOW FOR EXTERNAL BACKEND USE (External APIs only)
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3012
DB_TYPE=mysql
MYSQL_HOST=${envValue(params.mysql.host)}
MYSQL_PORT=${envValue(params.mysql.port)}
MYSQL_USER=${envValue(params.mysql.user)}
MYSQL_PASSWORD=${envValue(params.mysql.password || '')}
MYSQL_DATABASE=${envValue(params.mysql.database || DEFAULT_MYSQL_DATABASE_NAME)}
${tail}
`.trim();

  await fs.writeFile(ENV_PATH(), envContent, { flag: 'w' });
}

export async function writePostgresInstallEnv(params: {
  userDbName: string;
  pageDbName: string;
  postgres: PostgresCredentials;
  /** Preserve existing JWT when switching engines so sessions stay valid. */
  jwtSecret?: string;
}): Promise<void> {
  const jwtSecret = params.jwtSecret || crypto.randomBytes(32).toString('hex');
  const tail = COMMON_TAIL(params.userDbName, params.pageDbName, jwtSecret);
  const envContent = `
# NEXT CMS UNCOMMENT BELOW FOR EXTERNAL BACKEND USE (External APIs only)
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3012
DB_TYPE=postgres
POSTGRES_HOST=${envValue(params.postgres.host)}
POSTGRES_PORT=${envValue(params.postgres.port)}
POSTGRES_USER=${envValue(params.postgres.user)}
POSTGRES_PASSWORD=${envValue(params.postgres.password || '')}
POSTGRES_DATABASE=${envValue(params.postgres.database || DEFAULT_POSTGRES_DATABASE_NAME)}
${tail}
`.trim();

  await fs.writeFile(ENV_PATH(), envContent, { flag: 'w' });
}

export async function ensureEnvFileExists(): Promise<void> {
  try {
    await fs.access(ENV_PATH());
  } catch {
    await fs.writeFile(ENV_PATH(), '');
  }
}
