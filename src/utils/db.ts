import mongoose from 'mongoose';
import { IUser, userSchema } from '@/models/User';
import { ISettings, settingsSchema } from '@/models/Settings';
import { PageSchema } from '@/models/Page';
import { BlogPostSchema } from '@/models/BlogPost';
import { roleSchema } from '@/models/Role';
import { PluginSchema } from '@/models/Plugin';
import { PluginMigrationSchema, type IPluginMigrationDocument } from '@/models/PluginMigration';
import { PluginExtensionSchema } from '@/models/PluginExtension';
import {
  ExtensionMigrationSchema,
  type IExtensionMigrationDocument,
} from '@/models/ExtensionMigration';
import { PluginDataSchema, type IPluginDataDocument } from '@/models/PluginData';
import { CategorySchema } from '@/models/Category';
import { TagSchema } from '@/models/Tag';
import { AuthorSchema } from '@/models/Author';
import { CommentSchema } from '@/models/Comment';
import { AnalyticsEventSchema } from '@/models/AnalyticsEvent';
import { LayoutSchema } from '@/models/Layout';
import { ThemeSettingsSchema } from '@/models/ThemeSettings';
import { MenuRedirectMappingSchema } from '@/models/MenuRedirectMapping';
import { MenuRedirectAnalyticsSchema } from '@/models/MenuRedirectAnalytics';
import { MenuRedirectHistorySchema } from '@/models/MenuRedirectHistory';
import { FormSchema } from '@/models/Form';
import { FormSubmissionSchema } from '@/models/FormSubmission';
import { FormVersionSchema } from '@/models/FormVersion';
import {
  SocialMediaSettingsSchema,
  SocialMediaPostSchema,
} from '@/models/SocialMediaSettings';
import { ThemeSchema } from '@/models/Theme';
import { WebsitePreferencesSchema, IWebsitePreferences } from '@/models/WebsitePreferences';
import type {
  MenuRedirectMappingDocument,
  MenuRedirectAnalyticsDocument,
  MenuRedirectHistoryDocument,
} from '@/types/menu-redirect';
import type {
  IFormDocument,
  ISubmissionDocument,
  IFormVersionDocument,
} from '@/types/form-builder';
import type { ISocialMediaPost, ISocialMediaSettings } from '@/types/social-media';
import type { IThemeDocument } from '@/types/theme';
import type {
  PageDocument,
  IBlogPostDocument,
  ISettingsDocument,
  ITheme,
  IPluginDocument,
  ICategoryDocument,
  ITagDocument,
  IAuthorDocument,
  ICommentDocument,
  IAnalyticsEventDocument,
  ILayoutDocument,
  IBlogThemeSettingsDocument,
} from '@/types/index';
import { getDynamicEnv } from '@/utils/dynamicEnv';
import { withDbName } from '@/utils/mongoUri';
import { isMysql, isPostgres } from '@/lib/db/config';
import { closeMysqlPool, getMysqlConnection } from '@/lib/db/mysql/adapter';
import { closePostgresPool, getPostgresConnection } from '@/lib/db/postgres/adapter';

let userDb: mongoose.Connection | null = null;
let pageDb: mongoose.Connection | null = null;
let masterDb: mongoose.Connection | null = null;

/** Prevent connect stampedes under concurrent cold starts. */
let userDbConnecting: Promise<mongoose.Connection> | null = null;
let pageDbConnecting: Promise<mongoose.Connection> | null = null;
let masterDbConnecting: Promise<mongoose.Connection> | null = null;

/** Run Role/Settings seed and system-theme seed once per process, not on every reconnect. */
let userDbSeeded = false;
let pageDbThemesSeeded = false;

function mongoPoolOptions(): mongoose.ConnectOptions {
  const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE) || 25;
  const minPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE) || 2;
  return {
    maxPoolSize: Math.max(1, maxPoolSize),
    minPoolSize: Math.max(0, Math.min(minPoolSize, maxPoolSize)),
    maxIdleTimeMS: Number(process.env.MONGODB_MAX_IDLE_MS) || 30_000,
    waitQueueTimeoutMS: Number(process.env.MONGODB_WAIT_QUEUE_MS) || 10_000,
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_MS) || 30_000,
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45_000,
  };
}

async function createConnectionUri(dbName: string) {
  const {
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_CLUSTER,
    MONGODB_AUTH_MECH,
    MONGODB_AUTH_SOURCE,
    MONGODB,
    MONGODB_URI,
  } = getDynamicEnv();

  if (MONGODB === 'uri') {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is required when MONGODB=uri');
    }
    return withDbName(MONGODB_URI, dbName);
  }

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB) {
    throw new Error('MongoDB environment variables are not set');
  }

  if (MONGODB === 'atlas') {
    if (!MONGODB_CLUSTER) {
      throw new Error('MONGODB_CLUSTER is required for Atlas');
    }
    return `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
  } else if (MONGODB === 'compass') {
    if (!MONGODB_AUTH_MECH) {
      throw new Error('MONGODB_AUTH_MECH is required for Compass');
    }
    return `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${dbName}?authMechanism=${MONGODB_AUTH_MECH}&authSource=${MONGODB_AUTH_SOURCE}`;
  } else {
    throw new Error('Invalid MONGODB value in .env file');
  }
}

export async function getMasterDbConnection() {
  if (masterDb && (isMysql() || isPostgres() || masterDb.readyState === 1)) {
    return masterDb;
  }

  if (masterDbConnecting) return masterDbConnecting;

  masterDbConnecting = (async () => {
    if (isMysql()) {
      masterDb = (await getMysqlConnection('master')) as unknown as mongoose.Connection;
    } else if (isPostgres()) {
      masterDb = (await getPostgresConnection('master')) as unknown as mongoose.Connection;
    } else {
      const uri = await createConnectionUri('master');
      masterDb = await mongoose.createConnection(uri, mongoPoolOptions()).asPromise();
      masterDb.on('error', (error) => {
        console.error('MongoDB master database connection error:', error);
        masterDb = null;
      });
      masterDb.on('disconnected', () => {
        console.warn('MongoDB master database disconnected');
        masterDb = null;
      });
    }
    return masterDb!;
  })();

  try {
    return await masterDbConnecting;
  } finally {
    masterDbConnecting = null;
  }
}

export const getUserDbConnection = async () => {
  const dynamicEnv = getDynamicEnv();
  const USER_DB_NAME = dynamicEnv.USER_DB_NAME || 'users';

  if (!USER_DB_NAME) {
    throw new Error('USER_DB_NAME environment variable is not set');
  }

  if (userDb && (isMysql() || isPostgres() || userDb.readyState === 1)) {
    return userDb;
  }

  if (userDbConnecting) return userDbConnecting;

  userDbConnecting = (async () => {
    try {
      if (isMysql()) {
        userDb = (await getMysqlConnection(USER_DB_NAME)) as unknown as mongoose.Connection;
      } else if (isPostgres()) {
        userDb = (await getPostgresConnection(USER_DB_NAME)) as unknown as mongoose.Connection;
      } else {
        const uri = await createConnectionUri(USER_DB_NAME);
        userDb = await mongoose.createConnection(uri, mongoPoolOptions()).asPromise();
      }

      if (!userDb.models.User) {
        userDb.model<IUser>('User', userSchema);
      }

      if (!userDb.models.Plugin) {
        userDb.model<IPluginDocument>('Plugin', PluginSchema);
      }

      if (!userDb.models.PluginData) {
        userDb.model<IPluginDataDocument>('PluginData', PluginDataSchema);
      }

      if (!userDb.models.PluginMigration) {
        userDb.model<IPluginMigrationDocument>('PluginMigration', PluginMigrationSchema);
      }

      if (!userDbSeeded) {
        const RoleModel = userDb.models.Role || userDb.model('Role', roleSchema);
        const existingCount = await RoleModel.countDocuments({});
        if (existingCount === 0) {
          const roles = [
            { name: 'SuperAdmin', value: 0, type: 'system' },
            { name: 'Admin', value: 1, type: 'system' },
            { name: 'Editor', value: 2, type: 'system' },
            { name: 'Author', value: 3, type: 'system' },
          ];
          for (const role of roles) {
            await RoleModel.create(role);
          }
          console.log('Roles seeded in user DB.');
        }

        const SettingsModel = userDb.models.Settings || userDb.model('Settings', settingsSchema);
        const settings = await SettingsModel.findOne({});
        if (settings) {
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
        userDbSeeded = true;
      }

      if (!isMysql() && !isPostgres()) {
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

      return userDb!;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      userDb = null;
      throw error;
    }
  })();

  try {
    return await userDbConnecting;
  } finally {
    userDbConnecting = null;
  }
};

export async function getPageDbConnection() {
  const dynamicEnv = getDynamicEnv();
  const PAGE_DB_NAME = dynamicEnv.PAGE_DB_NAME || 'pages';

  if (pageDb && (isMysql() || isPostgres() || pageDb.readyState === 1)) {
    return pageDb;
  }

  if (pageDbConnecting) return pageDbConnecting;

  pageDbConnecting = (async () => {
    try {
      if (isMysql()) {
        pageDb = (await getMysqlConnection(PAGE_DB_NAME)) as unknown as mongoose.Connection;
      } else if (isPostgres()) {
        pageDb = (await getPostgresConnection(PAGE_DB_NAME)) as unknown as mongoose.Connection;
      } else {
        const uri = await createConnectionUri(PAGE_DB_NAME);
        pageDb = await mongoose.createConnection(uri, mongoPoolOptions()).asPromise();
      }

      if (!pageDb.models.Page) {
        pageDb.model<PageDocument>('Page', PageSchema);
      }

      if (!pageDb.models.BlogPost) {
        pageDb.model<IBlogPostDocument>('BlogPost', BlogPostSchema);
      }

      // Register the sibling blog collections on the same per-tenant page DB.
      if (!pageDb.models.Category) {
        pageDb.model<ICategoryDocument>('Category', CategorySchema);
      }
      if (!pageDb.models.Tag) {
        pageDb.model<ITagDocument>('Tag', TagSchema);
      }
      if (!pageDb.models.Author) {
        pageDb.model<IAuthorDocument>('Author', AuthorSchema);
      }
      if (!pageDb.models.Comment) {
        pageDb.model<ICommentDocument>('Comment', CommentSchema);
      }
      if (!pageDb.models.AnalyticsEvent) {
        pageDb.model<IAnalyticsEventDocument>('AnalyticsEvent', AnalyticsEventSchema);
      }
      if (!pageDb.models.Layout) {
        pageDb.model<ILayoutDocument>('Layout', LayoutSchema);
      }
      if (!pageDb.models.ThemeSettings) {
        pageDb.model<IBlogThemeSettingsDocument>('ThemeSettings', ThemeSettingsSchema);
      }
      if (!pageDb.models.MenuRedirectMapping) {
        pageDb.model<MenuRedirectMappingDocument>('MenuRedirectMapping', MenuRedirectMappingSchema);
      }
      if (!pageDb.models.MenuRedirectAnalytics) {
        pageDb.model<MenuRedirectAnalyticsDocument>(
          'MenuRedirectAnalytics',
          MenuRedirectAnalyticsSchema
        );
      }
      if (!pageDb.models.MenuRedirectHistory) {
        pageDb.model<MenuRedirectHistoryDocument>('MenuRedirectHistory', MenuRedirectHistorySchema);
      }

      // Form Builder plugin collections (per-tenant page DB).
      if (!pageDb.models.Form) {
        pageDb.model<IFormDocument>('Form', FormSchema);
      }
      if (!pageDb.models.FormSubmission) {
        pageDb.model<ISubmissionDocument>('FormSubmission', FormSubmissionSchema);
      }
      if (!pageDb.models.FormVersion) {
        pageDb.model<IFormVersionDocument>('FormVersion', FormVersionSchema);
      }

      // Social Media Integration plugin collections (per-tenant page DB).
      if (!pageDb.models.SocialMediaSettings) {
        pageDb.model<ISocialMediaSettings>('SocialMediaSettings', SocialMediaSettingsSchema);
      }
      if (!pageDb.models.SocialMediaPost) {
        pageDb.model<ISocialMediaPost>('SocialMediaPost', SocialMediaPostSchema);
      }

      // Site-wide Theme Builder collection (per-tenant page DB).
      if (!pageDb.models.Theme) {
        pageDb.model<IThemeDocument>('Theme', ThemeSchema);
      }

      // Website Setup Wizard preferences (per-tenant page DB).
      if (!pageDb.models.WebsitePreferences) {
        pageDb.model<IWebsitePreferences>('WebsitePreferences', WebsitePreferencesSchema);
      }

      // Auto-seed system themes once per process (idempotent upsert-by-slug).
      if (!pageDbThemesSeeded) {
        try {
          const { seedSystemThemes } = await import('@/lib/theme/seed');
          await seedSystemThemes(pageDb);
          pageDbThemesSeeded = true;
        } catch (seedErr) {
          console.warn('⚠️ System theme auto-seed skipped:', seedErr);
        }
      }

      if (!isMysql() && !isPostgres()) {
        pageDb.on('error', (error) => {
          console.error('❌ MongoDB page database connection error:', error);
          pageDb = null;
        });

        pageDb.on('connected', () => {
          console.log(`✅ MongoDB page database (${PAGE_DB_NAME}) connected successfully`);
        });

        pageDb.on('disconnected', () => {
          console.warn('⚠️ MongoDB page database disconnected');
          pageDb = null;
        });
      }

      return pageDb!;
    } catch (error) {
      console.error('❌ MongoDB page connection error:', error);
      pageDb = null;
      throw error;
    }
  })();

  try {
    return await pageDbConnecting;
  } finally {
    pageDbConnecting = null;
  }
}
export function getPageModel(pageDb: mongoose.Connection): mongoose.Model<PageDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.Page as mongoose.Model<PageDocument>) ||
    pageDb.model<PageDocument>('Page', PageSchema)
  );
}

export function getBlogPostModel(
  pageDb: mongoose.Connection
): mongoose.Model<IBlogPostDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.BlogPost as mongoose.Model<IBlogPostDocument>) ||
    pageDb.model<IBlogPostDocument>('BlogPost', BlogPostSchema)
  );
}
export function getCategoryModel(
  pageDb: mongoose.Connection
): mongoose.Model<ICategoryDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.Category as mongoose.Model<ICategoryDocument>) ||
    pageDb.model<ICategoryDocument>('Category', CategorySchema)
  );
}

export function getTagModel(pageDb: mongoose.Connection): mongoose.Model<ITagDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.Tag as mongoose.Model<ITagDocument>) ||
    pageDb.model<ITagDocument>('Tag', TagSchema)
  );
}

export function getAuthorModel(pageDb: mongoose.Connection): mongoose.Model<IAuthorDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.Author as mongoose.Model<IAuthorDocument>) ||
    pageDb.model<IAuthorDocument>('Author', AuthorSchema)
  );
}

export function getCommentModel(pageDb: mongoose.Connection): mongoose.Model<ICommentDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.Comment as mongoose.Model<ICommentDocument>) ||
    pageDb.model<ICommentDocument>('Comment', CommentSchema)
  );
}

export function getAnalyticsEventModel(
  pageDb: mongoose.Connection
): mongoose.Model<IAnalyticsEventDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.AnalyticsEvent as mongoose.Model<IAnalyticsEventDocument>) ||
    pageDb.model<IAnalyticsEventDocument>('AnalyticsEvent', AnalyticsEventSchema)
  );
}

export function getLayoutModel(pageDb: mongoose.Connection): mongoose.Model<ILayoutDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.Layout as mongoose.Model<ILayoutDocument>) ||
    pageDb.model<ILayoutDocument>('Layout', LayoutSchema)
  );
}

export function getThemeSettingsModel(
  pageDb: mongoose.Connection
): mongoose.Model<IBlogThemeSettingsDocument> {
  if (!pageDb) {
    throw new Error('Page database connection not initialized');
  }
  return (
    (pageDb.models.ThemeSettings as mongoose.Model<IBlogThemeSettingsDocument>) ||
    pageDb.model<IBlogThemeSettingsDocument>('ThemeSettings', ThemeSettingsSchema)
  );
}

export function getMenuRedirectMappingModel(
  pageDb: mongoose.Connection
): mongoose.Model<MenuRedirectMappingDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.MenuRedirectMapping as mongoose.Model<MenuRedirectMappingDocument>) ||
    pageDb.model<MenuRedirectMappingDocument>('MenuRedirectMapping', MenuRedirectMappingSchema)
  );
}

export function getMenuRedirectAnalyticsModel(
  pageDb: mongoose.Connection
): mongoose.Model<MenuRedirectAnalyticsDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.MenuRedirectAnalytics as mongoose.Model<MenuRedirectAnalyticsDocument>) ||
    pageDb.model<MenuRedirectAnalyticsDocument>('MenuRedirectAnalytics', MenuRedirectAnalyticsSchema)
  );
}

export function getMenuRedirectHistoryModel(
  pageDb: mongoose.Connection
): mongoose.Model<MenuRedirectHistoryDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.MenuRedirectHistory as mongoose.Model<MenuRedirectHistoryDocument>) ||
    pageDb.model<MenuRedirectHistoryDocument>('MenuRedirectHistory', MenuRedirectHistorySchema)
  );
}

export function getFormModel(pageDb: mongoose.Connection): mongoose.Model<IFormDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.Form as mongoose.Model<IFormDocument>) ||
    pageDb.model<IFormDocument>('Form', FormSchema)
  );
}

export function getFormSubmissionModel(
  pageDb: mongoose.Connection
): mongoose.Model<ISubmissionDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.FormSubmission as mongoose.Model<ISubmissionDocument>) ||
    pageDb.model<ISubmissionDocument>('FormSubmission', FormSubmissionSchema)
  );
}

export function getFormVersionModel(
  pageDb: mongoose.Connection
): mongoose.Model<IFormVersionDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.FormVersion as mongoose.Model<IFormVersionDocument>) ||
    pageDb.model<IFormVersionDocument>('FormVersion', FormVersionSchema)
  );
}

export function getSocialMediaSettingsModel(
  pageDb: mongoose.Connection
): mongoose.Model<ISocialMediaSettings> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.SocialMediaSettings as mongoose.Model<ISocialMediaSettings>) ||
    pageDb.model<ISocialMediaSettings>('SocialMediaSettings', SocialMediaSettingsSchema)
  );
}

export function getSocialMediaPostModel(
  pageDb: mongoose.Connection
): mongoose.Model<ISocialMediaPost> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.SocialMediaPost as mongoose.Model<ISocialMediaPost>) ||
    pageDb.model<ISocialMediaPost>('SocialMediaPost', SocialMediaPostSchema)
  );
}

export function getThemeModel(pageDb: mongoose.Connection): mongoose.Model<IThemeDocument> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.Theme as mongoose.Model<IThemeDocument>) ||
    pageDb.model<IThemeDocument>('Theme', ThemeSchema)
  );
}

export function getWebsitePreferencesModel(
  pageDb: mongoose.Connection
): mongoose.Model<IWebsitePreferences> {
  if (!pageDb) throw new Error('Page database connection not initialized');
  return (
    (pageDb.models.WebsitePreferences as mongoose.Model<IWebsitePreferences>) ||
    pageDb.model<IWebsitePreferences>('WebsitePreferences', WebsitePreferencesSchema)
  );
}

export function getUserModel(): mongoose.Model<IUser> {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return (userDb.models.User as mongoose.Model<IUser>) || userDb.model<IUser>('User', userSchema);
}

export function getSettingsModel(): mongoose.Model<ISettings> {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return (
    (userDb.models.Settings as mongoose.Model<ISettings>) ||
    userDb.model<ISettings>('Settings', settingsSchema)
  );
}

export function getPluginModel(): mongoose.Model<IPluginDocument> {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return (
    (userDb.models.Plugin as mongoose.Model<IPluginDocument>) ||
    userDb.model<IPluginDocument>('Plugin', PluginSchema)
  );
}

export function getPluginDataModel(): mongoose.Model<IPluginDataDocument> {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return (
    (userDb.models.PluginData as mongoose.Model<IPluginDataDocument>) ||
    userDb.model<IPluginDataDocument>('PluginData', PluginDataSchema)
  );
}

export function getPluginMigrationModel(): mongoose.Model<IPluginMigrationDocument> {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return (
    (userDb.models.PluginMigration as mongoose.Model<IPluginMigrationDocument>) ||
    userDb.model<IPluginMigrationDocument>('PluginMigration', PluginMigrationSchema)
  );
}

export function getPluginExtensionModel(): mongoose.Model<Record<string, unknown>> {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return (
    (userDb.models.PluginExtension as mongoose.Model<Record<string, unknown>>) ||
    userDb.model<Record<string, unknown>>('PluginExtension', PluginExtensionSchema)
  );
}

export function getExtensionMigrationModel(): mongoose.Model<IExtensionMigrationDocument> {
  if (!userDb) {
    throw new Error('User database connection not initialized');
  }
  return (
    (userDb.models.ExtensionMigration as mongoose.Model<IExtensionMigrationDocument>) ||
    userDb.model<IExtensionMigrationDocument>('ExtensionMigration', ExtensionMigrationSchema)
  );
}

export async function closeAllConnections() {
  await Promise.all([userDb?.close(), pageDb?.close(), masterDb?.close()]);
  userDb = null;
  pageDb = null;
  masterDb = null;
  await closeMysqlPool();
  await closePostgresPool();
}
