// src/lib/db.ts
import mongoose from 'mongoose';
import { IUser, userSchema } from '@/models/User';

let userDb: mongoose.Connection | null = null;
let pageDbConnection: Promise<typeof mongoose> | null = null;

export async function getUserDbConnection() {
  const {
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_CLUSTER,
    USER_DB_NAME,
  } = process.env;

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER || !USER_DB_NAME) {
    throw new Error('MongoDB environment variables are not set');
  }

  const uri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${USER_DB_NAME}?retryWrites=true&w=majority`;

  if (!userDb) {
    // If there's no existing connection, create one
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    userDb = mongoose.connection.useDb(USER_DB_NAME);
  }

  // Initialize the User model if it doesn't exist
  if (!userDb.models['User']) {
    userDb.model<IUser>('User', userSchema);
  }

  return userDb;
}

export async function getPageDb() {
  if (pageDbConnection === null) {
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_HOST;
    const cluster = process.env.MONGODB_CLUSTER;
    const dbName = process.env.PAGE_DB_NAME;

    if (!username || !password || !host || !cluster || !dbName) {
      throw new Error('Missing required database configuration');
    }

    const uri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${dbName}?retryWrites=true&w=majority`;

    pageDbConnection = mongoose.connect(uri, {
      maxPoolSize: 10,
    });

    // Handle connection errors
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      pageDbConnection = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      pageDbConnection = null;
    });
  }

  return pageDbConnection;
}

export function getUserModel() {
  if (!userDb) {
    throw new Error('Database connection not initialized');
  }
  return userDb.model<IUser>('User');
}