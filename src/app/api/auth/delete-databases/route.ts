import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

export async function POST(req: NextRequest) {
  const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_CLUSTER } = process.env;

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER) {
    return handleError(
      new Error('MongoDB credentials are missing'),
      'MongoDB credentials are missing'
    );
  }

  // Build connection string for the master database.
  const masterDbUrl = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/?retryWrites=true&w=majority&appName=${MONGODB_CLUSTER}`;

  try {
    // Connect to the master database
    await mongoose.connect(masterDbUrl);

    if (!mongoose.connection.db) {
      throw new Error('Database connection is undefined');
    }

    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();

    // Filter out system databases
    const nonSystemDatabases = databases.filter(db =>
      !['admin', 'local', 'config'].includes(db.name)
    );

    // Drop each non‑system database sequentially.
    for (const db of nonSystemDatabases) {
      const dbToDrop = mongoose.connection.useDb(db.name);
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
