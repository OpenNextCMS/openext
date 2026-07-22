import type mongoose from 'mongoose';
import { getUserDbConnection, getPageDbConnection } from '@/utils/db';
import type { AuthUser } from '@/lib/api/auth';
import type { PluginApp } from '@/lib/plugins/server/router';

export interface CmsSdk {
  pluginId: string;
  database: {
    user: () => Promise<mongoose.Connection>;
    page: () => Promise<mongoose.Connection>;
  };
  models: {
    register: (name: string, schema: mongoose.Schema) => mongoose.Model<unknown>;
    get: (name: string) => mongoose.Model<unknown> | undefined;
  };
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  permissions: {
    list: () => string[];
    has: (permission: string) => boolean;
  };
  events: {
    emit: (event: string, payload?: unknown) => void;
    on: (event: string, handler: (payload?: unknown) => void) => void;
  };
}

const eventHandlers = new Map<string, Set<(payload?: unknown) => void>>();

export function createCmsSdk(pluginId: string, permissions: string[], user: AuthUser | null): CmsSdk {
  const registeredModels = new Map<string, mongoose.Model<unknown>>();
  let userConn: mongoose.Connection | null = null;
  let pageConn: mongoose.Connection | null = null;

  return {
    pluginId,
    database: {
      async user() {
        if (!userConn) userConn = await getUserDbConnection();
        return userConn;
      },
      async page() {
        if (!pageConn) pageConn = await getPageDbConnection();
        return pageConn;
      },
    },
    models: {
      register(name: string, schema: mongoose.Schema) {
        const modelName = `${pluginId}_${name}`;
        if (registeredModels.has(modelName)) {
          return registeredModels.get(modelName)!;
        }
        if (!userConn) {
          throw new Error('Call cms.database.user() before registering models');
        }
        const model =
          (userConn.models[modelName] as mongoose.Model<unknown>) ||
          userConn.model<unknown>(modelName, schema);
        registeredModels.set(modelName, model);
        return model;
      },
      get(name: string) {
        return registeredModels.get(`${pluginId}_${name}`);
      },
    },
    logger: {
      info: (...args: unknown[]) => console.log(`[plugin:${pluginId}]`, ...args),
      warn: (...args: unknown[]) => console.warn(`[plugin:${pluginId}]`, ...args),
      error: (...args: unknown[]) => console.error(`[plugin:${pluginId}]`, ...args),
    },
    permissions: {
      list: () => [...permissions],
      has(permission: string) {
        if (!user) return false;
        if (typeof user.role === 'number' && user.role <= 1) return true;
        return permissions.includes(permission);
      },
    },
    events: {
      emit(event: string, payload?: unknown) {
        const handlers = eventHandlers.get(`${pluginId}:${event}`);
        handlers?.forEach((handler) => handler(payload));
      },
      on(event: string, handler: (payload?: unknown) => void) {
        const key = `${pluginId}:${event}`;
        if (!eventHandlers.has(key)) eventHandlers.set(key, new Set());
        eventHandlers.get(key)!.add(handler);
      },
    },
  };
}

export function createAuthMiddleware(app: PluginApp, requiredPermissions: string[] = []): void {
  app.use(async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (requiredPermissions.length > 0) {
      const isAdmin = typeof req.user.role === 'number' && req.user.role <= 1;
      const hasPermission = requiredPermissions.some((perm) => req.permissions.includes(perm));
      if (!isAdmin && !hasPermission) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    await next();
  });
}
