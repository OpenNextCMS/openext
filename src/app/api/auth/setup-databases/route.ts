import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
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
    const master = mongoose.connection.useDb("master");

    // Create collections in the page database only
    await userDb.createCollection('users');
    await pageDb.createCollection('pages');
    await master.createCollection('masterdbs');

    // Set cookie to indicate that database setup is completed
    const response = handleSuccess(true, 'Databases setup successful');
    // response.cookies.set('isRegistrationComplete', 'true', { path: '/' });

    return response;
  } catch (error) {
    return handleError(error, 'Failed to setup databases');
  }
}
