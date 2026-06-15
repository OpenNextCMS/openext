import mongoose from 'mongoose';
import { IUser, userSchema } from '@/models/User';
import { ISettings, settingsSchema } from '@/models/Settings';
import { PageSchema } from '@/models/Page';
import { BlogPostSchema } from '@/models/BlogPost';
import { roleSchema } from '@/models/Role';
import { PluginSchema } from '@/models/Plugin';
<<<<<<< HEAD
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
=======
import type { PageDocument, ISettingsDocument, ITheme, IPluginDocument } from '@/types/index';
>>>>>>> khadija
import { getDynamicEnv } from '@/utils/dynamicEnv';
import { withDbName } from '@/utils/mongoUri';

let userDb: mongoose.Connection | null = null;
let pageDb: mongoose.Connection | null = null;
let masterDb: mongoose.Connection | null = null;

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
  if (!masterDb) {
    const uri = await createConnectionUri('master');
    masterDb = await mongoose.createConnection(uri);
  }
  return masterDb;
}

export const getUserDbConnection = async () => {
  const dynamicEnv = getDynamicEnv();
  const USER_DB_NAME = dynamicEnv.USER_DB_NAME || 'users';

  if (!USER_DB_NAME) {
    throw new Error('USER_DB_NAME environment variable is not set');
  }

  try {
    if (!userDb) {
      const uri = await createConnectionUri(USER_DB_NAME);
      userDb = await mongoose.createConnection(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });

      if (!userDb.models.User) {
        userDb.model<IUser>('User', userSchema);
      }

      if (!userDb.models.Plugin) {
        userDb.model<IPluginDocument>('Plugin', PluginSchema);
      }

      const RoleModel = userDb.models.Role || userDb.model('Role', roleSchema);
      const existingCount = await RoleModel.countDocuments({});
      if (existingCount === 0) {
        const roles = [
          { name: 'SuperAdmin', value: 0 },
          { name: 'Admin', value: 1 },
          { name: 'Editor', value: 2 },
          { name: 'Author', value: 3 },
          { name: 'Author', value: 3 },
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
  const dynamicEnv = getDynamicEnv();
  const PAGE_DB_NAME = dynamicEnv.PAGE_DB_NAME || 'pages';

  try {
    if (!pageDb || pageDb.readyState !== 1) {
      const uri = await createConnectionUri(PAGE_DB_NAME);
      pageDb = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      }).asPromise();

      if (!pageDb.models.Page) {
        pageDb.model<PageDocument>('Page', PageSchema);
      }

<<<<<<< HEAD
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

      // Site-wide Theme Builder collection (per-tenant page DB).
      if (!pageDb.models.Theme) {
        pageDb.model<IThemeDocument>('Theme', ThemeSchema);
      }

      // Website Setup Wizard preferences (per-tenant page DB).
      if (!pageDb.models.WebsitePreferences) {
        pageDb.model<IWebsitePreferences>('WebsitePreferences', WebsitePreferencesSchema);
      }

      // Auto-seed the in-code system themes. `seedSystemThemes` is an idempotent
      // upsert-by-slug that only sets `isActive` on insert, so running it on
      // every fresh connection (once per process) safely propagates newly-added
      // system themes (e.g. Luxury/Dark) to existing tenants without disturbing
      // an existing active selection. Best-effort: a seed failure must never
      // break page loads.
      try {
        const { seedSystemThemes } = await import('@/lib/theme/seed');
        await seedSystemThemes(pageDb);
      } catch (seedErr) {
        console.warn('⚠️ System theme auto-seed skipped:', seedErr);
      }

=======
>>>>>>> khadija
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

    return pageDb;
  } catch (error) {
    console.error('❌ MongoDB page connection error:', error);
    throw error;
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

export async function closeAllConnections() {
  await Promise.all([userDb?.close(), pageDb?.close(), masterDb?.close()]);
  userDb = null;
  pageDb = null;
  masterDb = null;
}
