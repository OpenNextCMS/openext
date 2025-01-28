import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { MasterDb } from '@/models/MasterDb';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler

export async function POST(req: NextRequest) {
  const { userDbName, pageDbName, mongodbCredentials } = await req.json();

  if (!userDbName || !pageDbName || !mongodbCredentials) {
    return handleError(new Error('All fields are required'), 'All fields are required');
  }

  const { username, password, host, cluster } = mongodbCredentials;
  const masterDbUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/master?retryWrites=true&w=majority&appName=${cluster}`;

  try {
    // Connect to the master database
    await mongoose.connect(masterDbUrl);

    // Create the user and page databases
    const userDb = mongoose.connection.useDb(userDbName);
    const pageDb = mongoose.connection.useDb(pageDbName);

    // Create collections in the user and page databases
    await userDb.createCollection('users');
    await pageDb.createCollection('pages');

    // Store the database names in the master database
    const masterDb = new MasterDb({ userDbName, pageDbName });
    await masterDb.save();

    // Write the MongoDB credentials to the .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Check if .env.local file exists, if not create it
    try {
      await fs.access(envPath);
    } catch {
      await fs.writeFile(envPath, '');
    }

    // Generate a random JWT secret
    const jwtSecret = crypto.randomBytes(32).toString('hex');

    const envContent = `
    JWT_SECRET=${jwtSecret}
MONGODB_USERNAME=${username}
MONGODB_PASSWORD=${password}
MONGODB_HOST=${host}
MONGODB_CLUSTER=${cluster}
USER_DB_NAME=${userDbName}
PAGE_DB_NAME=${pageDbName}
    `;
    await fs.writeFile(envPath, envContent.trim(), { flag: 'w' });

    // Set cookie to indicate that database setup is completed
    const response = handleSuccess(true, 'Databases setup successful and credentials stored');
    response.cookies.set('isRegistrationComplete', 'true', { path: '/' });

    return response;
  } catch (error) {
    return handleError(error, 'Failed to setup databases');
  }
}
