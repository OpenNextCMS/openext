import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { handleError } from '@/utils/errorHandler'; // Import error handler
import { handleSuccess } from '@/utils/successHandler'; // Import success handler
import { isValidMongoUri } from '@/utils/mongoUri';

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    const { mongoDB, username, password, host, cluster, authMech, authSource, uri } = requestBody;
    let mongodbUrl = '';
    let successMessage = '';

    if (mongoDB === 'uri') {
      if (!uri || !isValidMongoUri(uri)) {
        return handleError(
          new Error('A valid MongoDB connection URI is required'),
          'A valid MongoDB connection URI is required (must start with mongodb:// or mongodb+srv://)'
        );
      }
      mongodbUrl = uri;
      successMessage = 'MongoDB connection successful';
    } else if (mongoDB === 'atlas') {
      // Validate Atlas credentials
      if (!username || !password || !host || !cluster) {
        return handleError(
          new Error('All MongoDB Atlas credentials are required'),
          'All MongoDB Atlas credentials are required'
        );
      }

      // Construct MongoDB Atlas URL
      mongodbUrl = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/?retryWrites=true&w=majority&appName=${cluster}`;
      successMessage = 'MongoDB Atlas connection successful';
    } else if (mongoDB === 'compass') {
      // Validate Compass credentials
      if (!username || !password || !host) {
        return handleError(
          new Error('All MongoDB Compass credentials are required'),
          'All MongoDB Compass credentials are required'
        );
      }

      // Construct MongoDB Compass URL
      mongodbUrl = `mongodb://${username}:${password}@${host}/?authMechanism=${authMech}&authSource=${authSource}`;
      successMessage = 'MongoDB Compass connection successful';
    } else {
      return handleError(
        new Error('Invalid MongoDB type'),
        'Invalid MongoDB type. Must be "atlas", "compass", or "uri"'
      );
    }

    // Attempt to connect to the MongoDB database
    await mongoose.connect(mongodbUrl);

    // If successful, disconnect
    await mongoose.disconnect();

    return handleSuccess(true, null, successMessage, 200);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string | number; name?: string; reason?: { message?: string } };
    const errMsg = err.message || '';
    const code = err.code || '';

    // LOG ERROR FOR DEBUGGING
    console.log('MONGOOSE ERROR DEBUG:', {
      message: errMsg,
      code,
      name: err.name,
      reason: err.reason?.message,
    });

    // 1. VPN, DNS Blocking, or DNS Server Failure (c-ares resolution issues)
    // We check this FIRST because DNS issues often cause MongooseServerSelectionError
    if (
      code === 'EAI_AGAIN' ||
      code === 'EAI_FAIL' ||
      errMsg.includes('querySrv') ||
      errMsg.toLowerCase().includes('ares') ||
      errMsg.toLowerCase().includes('getaddrinfo')
    ) {
      return handleError(
        error,
        'INVALID_HOSTNAME OR VPN_DNS_ISSUE: DNS resolution failed or was blocked. This is common when a VPN or Firewall interferes with MongoDB SRV records. Try disabling your VPN.Or Check your hostName and and clustname '
      );
    }

    // 3. Server Selection / Network Timeout (IP Whitelist or Firewall)
    if (
      err.name === 'MongoServerSelectionError' ||
      err.name === 'MongooseServerSelectionError' ||
      code === 'ETIMEDOUT' ||
      errMsg.includes('timed out') ||
      errMsg.includes('Could not connect to any servers')
    ) {
      // If the message contains "whitelist", it's likely an IP issue
      // Atlas specifically mentions "IP whitelist" in its timeout message
      if (errMsg.toLowerCase().includes('whitelist')) {
        return handleError(
          error,
          'VPN_DNS_ISSUE: DNS resolution failed or was blocked. This is common when a VPN or Firewall interferes with MongoDB SRV records. Try disabling your VPN.'
        );
      }

      return handleError(
        error,
        'CONNECTION_TIMEOUT: Unable to reach the MongoDB cluster. This is likely due to a firewall blocking port 27017 or a network-level block.'
      );
    }

    // Authentication Error
    if (errMsg.includes('Authentication failed') || err.code === 18) {
      return handleError(
        error,
        'INVALID_CREDENTIALS: The provided username or password is incorrect.'
      );
    }

    return handleError(error, 'Failed to connect to MongoDB');
  }
}

