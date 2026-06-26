import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { getDynamicEnv } from '@/utils/dynamicEnv';
import { withDbName } from '@/utils/mongoUri';

dotenv.config();

export async function POST() {
  const {
    MONGODB,
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_CLUSTER,
    MONGODB_AUTH_MECH,
    MONGODB_AUTH_SOURCE,
    MONGODB_URI,
  } = getDynamicEnv();

  if (MONGODB === 'uri') {
    if (!MONGODB_URI) {
      return handleError(
        new Error('MONGODB_URI is missing'),
        'MONGODB_URI is required when MONGODB=uri'
      );
    }
  } else if (
    !MONGODB ||
    !MONGODB_USERNAME ||
    !MONGODB_PASSWORD ||
    !MONGODB_HOST ||
    (MONGODB === 'atlas' && !MONGODB_CLUSTER)
  ) {
    return handleError(
      new Error('MongoDB credentials are missing'),
      'MongoDB credentials are missing'
    );
  }

  // Function to generate a connection URL based on MongoDB type
  const getDbUrl = (dbName: string) => {
    if (MONGODB === 'uri') {
      return withDbName(MONGODB_URI as string, dbName);
    }
    if (MONGODB === 'atlas') {
      return `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=${MONGODB_CLUSTER}`;
    } else if (MONGODB === 'compass') {
      return `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${dbName}?authMechanism=${MONGODB_AUTH_MECH}&authSource=${MONGODB_AUTH_SOURCE}`;
    }
    throw new Error('Invalid MongoDB type');
  };

  try {
    const masterDbUrl = getDbUrl('master');
    const masterDbConnection = await mongoose.createConnection(masterDbUrl).asPromise();

    if (!masterDbConnection.db) {
      throw new Error('Database connection is undefined');
    }

    const admin = masterDbConnection.db.admin();
    const { databases } = await admin.listDatabases();

    // Filter out system databases
    const nonSystemDatabases = databases.filter(
      (db) => !['admin', 'local', 'config'].includes(db.name)
    );

    // Drop each non-system database sequentially
    for (const db of nonSystemDatabases) {
      const dbToDrop = masterDbConnection.useDb(db.name);
      await dbToDrop.dropDatabase();
    }

    // Clear the .env file
    const envPath = path.join(process.cwd(), '.env');
    await fs.writeFile(envPath, '', { flag: 'w' });

    return handleSuccess(
      true,
      null,
      'All non-system databases have been deleted and .env has been cleared'
    );
  } catch (error: unknown) {
    console.error('ACTUAL ERROR:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete databases';
    return handleError(error, message);
  } finally {
    await mongoose.disconnect();
  }
}
