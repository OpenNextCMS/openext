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

  const { username, password, host, cluster } = mongodbCredentials;
  const baseUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net`;
  
  try {
    // Create separate connections for each database
    const masterConnection = await mongoose.createConnection(
      `${baseUrl}/master?retryWrites=true&w=majority&appName=${cluster}`
    );

    const userConnection = await mongoose.createConnection(
      `${baseUrl}/${userDbName}?retryWrites=true&w=majority&appName=${cluster}`
    );

    const pageConnection = await mongoose.createConnection(
      `${baseUrl}/${pageDbName}?retryWrites=true&w=majority&appName=${cluster}`
    );

    // Create collections in their respective databases
    await Promise.all([
      masterConnection.createCollection('masterdbs'),
      userConnection.createCollection('users'),
      userConnection.createCollection('settings'),
      pageConnection.createCollection('pages')
    ]);

    // Close connections after setup
    await Promise.all([
      masterConnection.close(),
      userConnection.close(),
      pageConnection.close()
    ]);

    return handleSuccess(true, null, 'Databases setup successful');
  } catch (error) {
    return handleError(error, 'Failed to setup databases');
  }
}