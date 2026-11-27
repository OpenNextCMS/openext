import { DEFAULT_POSTGRES_DATABASE_NAME } from '@/lib/db/constants';
import { MYSQL_CMS_TABLES } from '@/lib/db/mysql/tables';

export { DEFAULT_POSTGRES_DATABASE_NAME };

/** Same CMS tables as MySQL — one physical Postgres database. */
export const POSTGRES_CMS_TABLES = [...MYSQL_CMS_TABLES] as const;
