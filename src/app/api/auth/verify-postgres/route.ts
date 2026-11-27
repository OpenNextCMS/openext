import { NextRequest } from 'next/server';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { DEFAULT_POSTGRES_DATABASE_NAME, sanitizePostgresIdent } from '@/lib/db/constants';
import { testPostgresConnection } from '@/lib/db/postgres/adapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const host = String(body.host || '').trim();
    const user = String(body.user || '').trim();
    const password = String(body.password ?? '');
    const port = Number(body.port || 5432);
    const databaseRaw = String(body.database || DEFAULT_POSTGRES_DATABASE_NAME).trim();

    if (!host || !user || !Number.isFinite(port)) {
      return handleError(
        new Error('PostgreSQL host, port, and username are required'),
        'PostgreSQL host, port, and username are required'
      );
    }

    try {
      sanitizePostgresIdent(databaseRaw, 'database name');
    } catch {
      return handleError(
        new Error('Database name may only contain letters, numbers, and underscores'),
        'Database name may only contain letters, numbers, and underscores'
      );
    }

    await testPostgresConnection({ host, port, user, password, database: databaseRaw });
    return handleSuccess(true, null, 'PostgreSQL connection successful');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to PostgreSQL';
    return handleError(error, message);
  }
}
