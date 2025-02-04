import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler

export async function POST(req: NextRequest) {
  const { username, password, host, cluster } = await req.json();

  if (!username || !password || !host || !cluster) {
    return handleError(new Error('All MongoDB credentials are required'), 'All MongoDB credentials are required');
  }

  const mongodbUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/?retryWrites=true&w=majority&appName=${cluster}`;

  try {
    // Attempt to connect to the MongoDB database
    await mongoose.connect(mongodbUrl);
    
    // If successful, disconnect
    await mongoose.disconnect();

    return handleSuccess(null, 'MongoDB connection successful');
  } catch (error) {
    return handleError(null, 'Failed to connect to MongoDB');
  }
}
