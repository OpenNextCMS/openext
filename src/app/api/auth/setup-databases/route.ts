// src/app/api/auth/setup-databases/route.ts
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { withDbName, isValidMongoUri } from '@/utils/mongoUri';

export async function POST(req: NextRequest) {
  const { userDbName, pageDbName, mongodbCredentials } = await req.json();

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
