import { NextRequest } from 'next/server';

import { handleError } from '@/utils/errorHandler';

import { handleSuccess } from '@/utils/successHandler';

import { DEFAULT_MYSQL_DATABASE_NAME, sanitizeMysqlIdent } from '@/lib/db/constants';

import { testMysqlConnection } from '@/lib/db/mysql/adapter';



export async function POST(req: NextRequest) {

  try {

    const body = await req.json();

    const host = String(body.host || '').trim();

    const user = String(body.user || '').trim();

    const password = String(body.password ?? '');

    const port = Number(body.port || 3306);

    const databaseRaw = String(body.database || DEFAULT_MYSQL_DATABASE_NAME).trim();



    if (!host || !user || !Number.isFinite(port)) {

      return handleError(

        new Error('MySQL host, port, and username are required'),

        'MySQL host, port, and username are required'

      );

    }



    try {

      sanitizeMysqlIdent(databaseRaw, 'database name');

    } catch {

      return handleError(

        new Error('Database name may only contain letters, numbers, and underscores'),

        'Database name may only contain letters, numbers, and underscores'

      );

    }



    await testMysqlConnection({ host, port, user, password });

    return handleSuccess(true, null, 'MySQL connection successful');

  } catch (error) {

    const message = error instanceof Error ? error.message : 'Failed to connect to MySQL';

    return handleError(error, message);

  }

}

