// src/app/api/auth/setup-databases/route.ts
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { withDbName, isValidMongoUri } from '@/utils/mongoUri';
import { ensureCmsMysqlSchema, dropLegacyMysqlDatabases } from '@/lib/db/mysql/adapter';
import {
  ensureCmsPostgresSchema,
  dropLegacyPostgresDatabases,
} from '@/lib/db/postgres/adapter';
import type { MysqlCredentials, PostgresCredentials } from '@/lib/db/config';

export async function POST(req: NextRequest) {
  const {
    userDbName,
    pageDbName,
    mongodbCredentials,
    mysqlCredentials,
    postgresCredentials,
    dbType,
  } = await req.json();

  if (dbType === 'mysql' || mysqlCredentials) {
    return setupMysql(mysqlCredentials);
  }

  if (dbType === 'postgres' || postgresCredentials) {
    return setupPostgres(postgresCredentials);
  }

  if (!userDbName || !pageDbName || !mongodbCredentials) {
    return handleError(null, 'All fields are required');
  }

  const { username, password, host, cluster, authMech, mongoDB, authSource, uri } =
    mongodbCredentials;

  let masterUri: string;
  let userUri: string;
  let pageUri: string;
  let connectionOptions: Record<string, unknown> = {};

  if (mongoDB === 'uri') {
    if (!uri || !isValidMongoUri(uri)) {
      return handleError(null, 'A valid MongoDB connection URI is required');
    }
    masterUri = withDbName(uri, 'master');
    userUri = withDbName(uri, userDbName);
    pageUri = withDbName(uri, pageDbName);
  } else if (mongoDB === 'atlas') {
    const baseUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net`;
    connectionOptions = {
      retryWrites: true,
      w: 'majority',
      appName: cluster,
    };
    masterUri = `${baseUrl}/master?`;
    userUri = `${baseUrl}/${userDbName}?`;
    pageUri = `${baseUrl}/${pageDbName}?`;
  } else if (mongoDB === 'compass') {
    const baseUrl = `mongodb://${username}:${password}@${host}`;
    connectionOptions = {
      authSource: authSource,
      authMechanism: authMech,
    };
    masterUri = `${baseUrl}/master?`;
    userUri = `${baseUrl}/${userDbName}?`;
    pageUri = `${baseUrl}/${pageDbName}?`;
  } else {
    return handleError(null, 'Invalid MongoDB type');
  }

  try {
    const masterConnection = await mongoose.createConnection(masterUri, connectionOptions);

    const userConnection = await mongoose.createConnection(userUri, connectionOptions);

    const pageConnection = await mongoose.createConnection(pageUri, connectionOptions);

    await Promise.all([
      masterConnection.createCollection('masterdbs'),
      userConnection.createCollection('users'),
      userConnection.createCollection('settings'),
      pageConnection.createCollection('pages'),
    ]);

    await Promise.all([masterConnection.close(), userConnection.close(), pageConnection.close()]);

    return handleSuccess(true, null, 'Databases setup successful');
  } catch (error) {
    return handleError(error, 'Failed to setup databases');
  }
}

async function setupMysql(mysqlCredentials: MysqlCredentials) {
  if (!mysqlCredentials?.host || !mysqlCredentials?.user) {
    return handleError(null, 'MySQL host and username are required');
  }

  try {
    const creds = {
      host: String(mysqlCredentials.host),
      port: Number(mysqlCredentials.port || 3306),
      user: String(mysqlCredentials.user),
      password: String(mysqlCredentials.password || ''),
      database: mysqlCredentials.database ? String(mysqlCredentials.database).trim() : undefined,
    };

    await dropLegacyMysqlDatabases(creds);
    await ensureCmsMysqlSchema(creds);
    return handleSuccess(true, null, 'Databases setup successful');
  } catch (error) {
    return handleError(error, 'Failed to setup MySQL databases');
  }
}

async function setupPostgres(postgresCredentials: PostgresCredentials) {
  if (!postgresCredentials?.host || !postgresCredentials?.user) {
    return handleError(null, 'PostgreSQL host and username are required');
  }

  try {
    const creds = {
      host: String(postgresCredentials.host),
      port: Number(postgresCredentials.port || 5432),
      user: String(postgresCredentials.user),
      password: String(postgresCredentials.password || ''),
      database: postgresCredentials.database
        ? String(postgresCredentials.database).trim()
        : undefined,
    };

    await dropLegacyPostgresDatabases(creds);
    await ensureCmsPostgresSchema(creds);
    return handleSuccess(true, null, 'Databases setup successful');
  } catch (error) {
    return handleError(error, 'Failed to setup PostgreSQL databases');
  }
}
