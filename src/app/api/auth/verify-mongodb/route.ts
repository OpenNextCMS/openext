import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler

export async function POST(req: NextRequest) {
  const { mongodbUrl } = await req.json();

  if (!mongodbUrl) {
    return handleError(new Error('MongoDB URL is required'), 'MongoDB URL is required');
  }

  try {
    // Attempt to connect to the MongoDB database
    await mongoose.connect(mongodbUrl);
    
    // If successful, disconnect
    await mongoose.disconnect();

    return handleSuccess(null, 'MongoDB connection successful');
  } catch (error) {
    return handleError(error, 'Failed to connect to MongoDB');
  }
}
