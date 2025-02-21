import mongoose from 'mongoose';
import { IUser, userSchema } from '@/models/User';
import { IProfile, profileSchema } from '@/models/Profile';
import { ISettings, settingsSchema } from '@/models/Settings';
import { IPage, pageSchema } from '@/models/Page';


let userDb: mongoose.Connection | null = null;
let pageDb: mongoose.Connection | null = null;
let masterDb: mongoose.Connection | null = null;

async function createConnectionUri(dbName: string) {
  const {
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_CLUSTER,
  } = process.env;

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER) {
    throw new Error('MongoDB environment variables are not set');
  }

  return `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
}

export async function getMasterDbConnection() {
  if (!masterDb) {
    const uri = await createConnectionUri('master');
    masterDb = await mongoose.createConnection(uri);
  }
  return masterDb;
}


export const getUserDbConnection = async () => {
  const USER_DB_NAME = process.env.USER_DB_NAME || 'users'; // Default to 'users' if not set

  if (!USER_DB_NAME) {
    throw new Error('USER_DB_NAME environment variable is not set');
  }

  try {
    if (!userDb) {
      const uri = await createConnectionUri(USER_DB_NAME);
      userDb = await mongoose.createConnection(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
        socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
      });

      // Initialize models only if they don't exist
      if (!userDb.models.User) {
        userDb.model<IUser>('User', userSchema);
      }
      if (!userDb.models.Profile) {
        userDb.model<IProfile>('Profile', profileSchema);
      }
      if (!userDb.models.Settings) {
        userDb.model<ISettings>('Settings', settingsSchema);
      }

      userDb.on('error', (error) => {
        console.error('MongoDB user database connection error:', error);
        userDb = null;
      });

      userDb.on('connected', () => {
        console.log('MongoDB user database connected successfully');
      });

      userDb.on('disconnected', () => {
        console.warn('MongoDB user database disconnected');
        userDb = null;
      });
    }

    return userDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export async function getPageDbConnection() {
  const PAGE_DB_NAME = process.env.PAGE_DB_NAME;

  if (!PAGE_DB_NAME) {
    throw new Error('PAGE_DB_NAME environment variable is not set');
  }

  if (!pageDb) {
    const uri = await createConnectionUri(PAGE_DB_NAME);
    pageDb = await mongoose.createConnection(uri, {
      maxPoolSize: 10,
    });

    // Initialize models only if they don't exist
    if (!pageDb.models.Page) {
      pageDb.model<IPage>('Page', pageSchema);
    }

    // Handle connection errors
    pageDb.on('error', (error) => {
      console.error('MongoDB page database connection error:', error);
      pageDb = null;
    });

    pageDb.on('disconnected', () => {
      console.warn('MongoDB page database disconnected');
      pageDb = null;
    });
  }

  return pageDb;
}

export function getUserModel() {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return userDb.model<IUser>('User');
}

export function getProfileModel() {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return userDb.model<IProfile>('Profile');
}

export function getSettingsModel() {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return userDb.model<ISettings>('Settings');
}

export function getPageModel() {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return pageDb.model<IPage>('Page');
}

// Helper function to close all connections
export async function closeAllConnections() {
  await Promise.all([
    userDb?.close(),
    pageDb?.close(),
    masterDb?.close()
  ]);
  
  userDb = null;
  pageDb = null;
  masterDb = null;
}