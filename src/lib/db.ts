// src/lib/db.ts
import mongoose from 'mongoose';
import { IUser, userSchema } from '@/models/User';
import { IPage, pageSchema } from '@/models/Page';
import { IProfile, profileSchema } from '@/models/Profile';
import { ISettings, settingsSchema } from '@/models/Settings';

let userDb: mongoose.Connection | null = null;
let pageDb: mongoose.Connection | null = null;

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

  // Initialize the User and Profile models if they don't exist
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
    throw new Error('MongoDB environment variables are not set');
  }

  const uri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${PAGE_DB_NAME}?retryWrites=true&w=majority`;

  if (!pageDb) {
    // If there's no existing connection, create one
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    pageDb = mongoose.connection.useDb(PAGE_DB_NAME);
  }

  // Initialize the Page model if it doesn't exist
  if (!pageDb.models['Page']) {
    pageDb.model<IPage>('Page', pageSchema);
  }

  return pageDb;
}

export function getUserModel() {
  if (!userDb) {
    throw new Error('Database connection not initialized');
  }
  return userDb.model<IUser>('User');
}

export function getProfileModel() {
  if (!userDb) {
    throw new Error('Database connection not initialized');
  }
  return userDb.model<IProfile>('Profile');
}

export function getSettingsModel() {
  if (!userDb) {
    throw new Error('Database connection not initialized');
  }
  return userDb.model<ISettings>('Settings');
}

export function getPageModel() {
  if (!pageDb) {
    throw new Error('Database connection not initialized');
  }
  return pageDb.model<IPage>('Page');
}