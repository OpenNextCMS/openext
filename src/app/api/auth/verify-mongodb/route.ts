import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    const { mongoDB, username, password, host, cluster, authMech } = requestBody;
    let mongodbUrl = '';
    let successMessage = '';

    if (mongoDB === 'atlas') {
      // Validate Atlas credentials
      if (!username || !password || !host || !cluster) {
        return handleError(new Error('All MongoDB Atlas credentials are required'), 'All MongoDB Atlas credentials are required');
      }

      // Construct MongoDB Atlas URL
      mongodbUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/?retryWrites=true&w=majority&appName=${cluster}`;
      successMessage = 'MongoDB Atlas connection successful';
    } 
    else if (mongoDB === 'compass') {
      // Validate Compass credentials
      if (!username || !password || !host) {
        return handleError(new Error('All MongoDB Compass credentials are required'), 'All MongoDB Compass credentials are required');
      }

      // Construct MongoDB Compass URL
      mongodbUrl = `mongodb://${username}:${password}@${host}/?authMechanism=${authMech}`;
      successMessage = 'MongoDB Compass connection successful';
    } 
    else {
      return handleError(new Error('Invalid MongoDB type'), 'Invalid MongoDB type. Must be "atlas" or "compass"');
    }

    // Attempt to connect to the MongoDB database
    await mongoose.connect(mongodbUrl);
    
    // If successful, disconnect
    await mongoose.disconnect();

    return handleSuccess(true, null, successMessage, 200);
  } catch (error) {
    return handleError(error, 'Failed to connect to MongoDB');
  }
}
