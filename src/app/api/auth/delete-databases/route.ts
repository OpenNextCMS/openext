import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

export async function POST() {
  const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_CLUSTER } = process.env;

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER) {
    return handleError(
      new Error('MongoDB credentials are missing'),
      'MongoDB credentials are missing'
    );
  }

  // Function to generate a connection URL for a given database
  const getDbUrl = (dbName: string) => 
    `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=${MONGODB_CLUSTER}`;

  const masterDbUrl = getDbUrl("master");

  try {
    // Create separate connections for each database
    const masterDbConnection = await mongoose.createConnection(masterDbUrl).asPromise();

    if (!masterDbConnection.db) {
      throw new Error('Database connection is undefined');
    }

    const admin = masterDbConnection.db.admin();
    const { databases } = await admin.listDatabases();

    // Filter out system databases
    const nonSystemDatabases = databases.filter(db =>
      !['admin', 'local', 'config'].includes(db.name)
    );

    // Drop each non‑system database sequentially.
    for (const db of nonSystemDatabases) {
      const dbToDrop = masterDbConnection.useDb(db.name);
      await dbToDrop.dropDatabase();
    }

    // At this point, all non‑system databases have been dropped successfully.
    // Now, clear the .env.local file.
    const envPath = path.join(process.cwd(), '.env.local');
    await fs.writeFile(envPath, '', { flag: 'w' });

    return handleSuccess(
      true,
      null,
      'All non-system databases have been deleted and .env.local has been cleared'
    );
  } catch (error) {
    return handleError(error, 'Failed to delete databases');
  } finally {
    await mongoose.disconnect();
  }
}