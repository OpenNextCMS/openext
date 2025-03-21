import mongoose from 'mongoose';
import { IUser, userSchema } from '@/models/User';
// Removed Profile and its schema import
import { ISettings, settingsSchema } from '@/models/Settings';
import { PageSchema, PageDocument } from '@/models/Page';
import { roleSchema } from '@/models/Role'; // NEW import

let userDb: mongoose.Connection | null = null;
let pageDb: mongoose.Connection | null = null;
let masterDb: mongoose.Connection | null = null;

async function createConnectionUri(dbName: string) {
  const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_CLUSTER } = process.env;

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER) {
    throw new Error('MongoDB environment variables are not set');
  }

  return `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
}

export async function getMasterDbConnection() {
  if (!masterDb) {
    const uri = await createConnectionUri('master');
    masterDb = await mongoose.createConnection(uri);
    // Removed role seeding from master DB
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
      // Removed Profile, Settings model initialization remains

      // NEW: Seed roles in user DB if not already seeded
      const RoleModel = userDb.models.Role || userDb.model('Role', roleSchema);
      const existingCount = await RoleModel.countDocuments({});
      if (existingCount === 0) {
        const roles = [
          { name: 'SuperAdmin', value: 0 },
          { name: 'Admin', value: 1 },
          { name: 'Editor', value: 2 },
          { name: 'Author', value: 3 },
        ];
        for (const role of roles) {
          await RoleModel.create(role);
        }
        console.log('Roles seeded in user DB.');
      }

      // NEW: Set default theme as active in settings
      const SettingsModel = userDb.models.Settings || userDb.model('Settings', settingsSchema);
      const settings = await SettingsModel.findOne({});
      if (settings) {
        interface ITheme {
          name: string;
          isActive: boolean;
        }

        interface ISettingsDocument extends mongoose.Document {
          siteTitle: string;
          language: string;
          timeZone: string;
          dateFormat: string;
          timeFormat: string;
          themes: ITheme[];
        }

        const themeExists: boolean = (settings as ISettingsDocument).themes.some(
          (theme: ITheme) => theme.name === 'openNextDefault'
        );
        if (!themeExists) {
          settings.themes.push({ name: 'openNextDefault', isActive: true });
          await settings.save();
        }
      } else {
        await SettingsModel.create({
          siteTitle: 'Default Site',
          language: 'en',
          timeZone: 'UTC',
          dateFormat: 'F j, Y',
          timeFormat: 'g:i a',
          themes: [{ name: 'openNextDefault', isActive: true }],
        });
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
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    // Initialize models only if they don't exist
    if (!pageDb.models.Page) {
      pageDb.model<PageDocument>('Page', PageSchema); // Ensure Page schema is registered
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

export function getSettingsModel() {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return userDb.model<ISettings>('Settings');
}

export function getPageModel(pageDb: mongoose.Connection) {
  // UPDATED
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return pageDb.model<PageDocument>('Page');
}

// Helper function to close all connections
export async function closeAllConnections() {
  await Promise.all([userDb?.close(), pageDb?.close(), masterDb?.close()]);

  userDb = null;
  pageDb = null;
  masterDb = null;
}
