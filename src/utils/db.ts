import mongoose from 'mongoose';
import { IUser, userSchema } from '@/models/User';
import { IProfile, profileSchema } from '@/models/Profile';
import { ISettings, settingsSchema } from '@/models/Settings';
import { IPage, pageSchema } from '@/models/Page';

let userDb: mongoose.Connection | null = null;
let pageDbConnection: mongoose.Connection | null = null;

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
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    userDb = mongoose.connection.useDb(USER_DB_NAME);
  }

  if (!userDb.models['User']) {
    userDb.model<IUser>('User', userSchema);
  }
  if (!userDb.models['Profile']) {
    userDb.model<IProfile>('Profile', profileSchema);
  }
  if (!userDb.models['Settings']) {
    userDb.model<ISettings>('Settings', settingsSchema);
  }

  return userDb;
}

export async function getPageDb() {
  const {
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_CLUSTER,
    PAGE_DB_NAME,
  } = process.env;

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER || !PAGE_DB_NAME) {
    throw new Error('Missing required database configuration');
  }

  const uri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${PAGE_DB_NAME}?retryWrites=true&w=majority`;

  if (!pageDbConnection) {
    pageDbConnection = await mongoose.createConnection(uri);

    pageDbConnection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      pageDbConnection = null;
    });

    pageDbConnection.on('disconnected', () => {
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

export function getPageModel() {
  if (!pageDbConnection) {
    throw new Error('Page database connection not initialized');
  }
  if (!pageDbConnection.models['Page']) {
    pageDbConnection.model<IPage>('Page', pageSchema);
  }
  return pageDbConnection.models['Page'];
}