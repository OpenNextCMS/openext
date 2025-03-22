// src/app/api/auth/setup-databases/route.ts
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';

export async function POST(req: NextRequest) {
  const { userDbName, pageDbName, mongodbCredentials } = await req.json();

  if (!userDbName || !pageDbName || !mongodbCredentials) {
    return handleError(null, 'All fields are required');
  }

  const { username, password, host, cluster, authMech, mongoDB } = mongodbCredentials;

  let baseUrl;
  let connectionOptions = {};

  if (mongoDB === 'atlas') {
    baseUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net`;
    connectionOptions = {
      retryWrites: true,
      w: 'majority',
      appName: cluster,
    };
  } else if (mongoDB === 'compass') {
    baseUrl = `mongodb://${username}:${password}@${host}`; // Remove "?authSource=admin"
    connectionOptions = {
      authSource: 'admin', // Pass authSource separately
      authMechanism: authMech,
    };
  } else {
    return handleError(null, 'Invalid MongoDB type');
  }

  try {
    const masterConnection = await mongoose.createConnection(
      `${baseUrl}/master?`,
      connectionOptions
    );

    const userConnection = await mongoose.createConnection(
      `${baseUrl}/${userDbName}?`,
      connectionOptions
    );

    const pageConnection = await mongoose.createConnection(
      `${baseUrl}/${pageDbName}?`,
      connectionOptions
    );

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
