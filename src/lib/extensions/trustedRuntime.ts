import path from 'node:path';
import type { ExtensionCapability } from '@/lib/extensions/constants';
import type {
  ExtensionContext,
  ExtensionMigrationContext,
  ExtensionRegistration,
} from '@/lib/extensions/contracts';
import { ExtensionError } from '@/lib/extensions/errors';
import {
  forgetRegistration,
  getExtensionHost,
  rememberRegistration,
} from '@/lib/extensions/hostRegistry';
import { logExtension, redact } from '@/lib/extensions/logger';
import { loadCjsModule } from '@/lib/plugins/server/loadCjsModule';

const shutdowns = new Map<string, () => void | Promise<void>>();

function guardCapability(allowed: Set<ExtensionCapability>, capability: ExtensionCapability): void {
  if (!allowed.has(capability)) {
    throw new ExtensionError(
      'unsupported_sdk',
      `This extension is not allowed to use ${capability}.`,
      403
    );
  }
}

export function createExtensionContext(options: {
  registration: ExtensionRegistration;
  approvedPermissions: string[];
}): ExtensionContext {
  const allowed = new Set(options.registration.capabilities);
  const approved = new Set(options.approvedPermissions);
  const host = () => {
    const adapter = getExtensionHost(options.registration.targetPluginId);
    if (!adapter) {
      throw new ExtensionError(
        'unsupported_sdk',
        'The target plugin extension host is not registered.',
        422
      );
    }
    return adapter;
  };

  const publish = async (registration: ExtensionRegistration) => {
    rememberRegistration(registration);
    await host().registerExtension(registration);
  };

  return {
    extensionId: options.registration.extensionId,
    targetPluginId: options.registration.targetPluginId,
    version: options.registration.version,
    capabilities: [...allowed],
    logger: {
      info(message, fields) {
        logExtension('info', 'runtime', {
          extensionId: options.registration.extensionId,
          message,
          ...(fields ? (redact(fields) as object) : {}),
        });
      },
      warn(message, fields) {
        logExtension('warn', 'runtime', {
          extensionId: options.registration.extensionId,
          message,
          ...(fields ? (redact(fields) as object) : {}),
        });
      },
      error(message, fields) {
        logExtension('error', 'runtime', {
          extensionId: options.registration.extensionId,
          message,
          ...(fields ? (redact(fields) as object) : {}),
        });
      },
    },
    permissions: {
      list: () => [...approved],
      has: (permission: string) => approved.has(permission),
    },
    navigation: {
      register(item) {
        guardCapability(allowed, 'navigation.register');
        const registration = options.registration;
        registration.contributions = {
          ...registration.contributions,
          navigation: [...(registration.contributions?.navigation ?? []), item],
        };
        void publish(registration);
      },
    },
    pages: {
      register(page) {
        guardCapability(allowed, 'ui.page.register');
        options.registration.contributions = {
          ...options.registration.contributions,
          pages: [...(options.registration.contributions?.pages ?? []), page],
        };
        void publish(options.registration);
      },
    },
    api: {
      register(route) {
        guardCapability(allowed, 'api.register');
        const method = route.method.toUpperCase();
        if (method !== 'GET' && method !== 'POST' && method !== 'PUT' && method !== 'PATCH' && method !== 'DELETE') {
          throw new ExtensionError('invalid_package', 'Unsupported route method.', 400);
        }
        options.registration.contributions = {
          ...options.registration.contributions,
          routes: [...(options.registration.contributions?.routes ?? []), { method, path: route.path }],
        };
        void publish(options.registration);
      },
    },
    events: {
      subscribe(name, handler) {
        guardCapability(allowed, 'events.subscribe');
        if (typeof handler !== 'function') {
          throw new ExtensionError('invalid_package', 'Event subscriptions require a handler.', 400);
        }
        options.registration.contributions = {
          ...options.registration.contributions,
          events: [...(options.registration.contributions?.events ?? []), { name }],
        };
        void publish(options.registration);
      },
    },
    settings: {
      register(setting) {
        guardCapability(allowed, 'settings.register');
        options.registration.contributions = {
          ...options.registration.contributions,
          settings: [
            ...(options.registration.contributions?.settings ?? []),
            setting as { key: string; label: string; type: 'string' | 'number' | 'boolean' | 'text' },
          ],
        };
        void publish(options.registration);
      },
    },
    fields: {
      register(field) {
        guardCapability(allowed, 'fields.register');
        options.registration.contributions = {
          ...options.registration.contributions,
          fields: [...(options.registration.contributions?.fields ?? []), field],
        };
        void publish(options.registration);
      },
    },
    workflows: {
      register(workflow) {
        guardCapability(allowed, 'workflows.register');
        options.registration.contributions = {
          ...options.registration.contributions,
          workflows: [...(options.registration.contributions?.workflows ?? []), workflow],
        };
        void publish(options.registration);
      },
    },
    health: {
      report(status, message) {
        logExtension(status === 'error' ? 'error' : 'info', 'health.report', {
          extensionId: options.registration.extensionId,
          status,
          message,
        });
      },
    },
  };
}

export function createMigrationContext(options: {
  extensionId: string;
  version: string;
}): ExtensionMigrationContext {
  return {
    extensionId: options.extensionId,
    version: options.version,
    logger: {
      info(message, fields) {
        logExtension('info', 'migration', { extensionId: options.extensionId, message, ...(fields ? (redact(fields) as object) : {}) });
      },
      warn(message, fields) {
        logExtension('warn', 'migration', { extensionId: options.extensionId, message, ...(fields ? (redact(fields) as object) : {}) });
      },
      error(message, fields) {
        logExtension('error', 'migration', { extensionId: options.extensionId, message, ...(fields ? (redact(fields) as object) : {}) });
      },
    },
    models: {
      async register(name: string, schema: unknown) {
        const { getUserDbConnection } = await import('@/utils/db');
        const connection = await getUserDbConnection();
        const safeName = `ext_${options.extensionId}_${name}`.replace(/[^A-Za-z0-9_]/g, '_');
        const existing = connection.models[safeName];
        if (existing) return existing;
        return connection.model(safeName, schema as never);
      },
    },
  };
}

/**
 * Loads a trusted extension's compiled CommonJS entry inside the CMS process.
 * This is not a sandbox. Callers must already have recorded administrator approval.
 * Untrusted packages must never reach this function.
 */
export async function executeTrustedBackend(absoluteEntry: string, context: ExtensionContext): Promise<void> {
  const resolved = path.resolve(absoluteEntry);
  const loaded = loadCjsModule(resolved) as {
    register?: (ctx: ExtensionContext) => void | Promise<void>;
    shutdown?: () => void | Promise<void>;
    default?: { register?: (ctx: ExtensionContext) => void | Promise<void>; shutdown?: () => void | Promise<void> };
  };
  const moduleRef = loaded.default && (loaded.default.register || loaded.default.shutdown) ? loaded.default : loaded;
  if (typeof moduleRef.register !== 'function') {
    throw new ExtensionError(
      'invalid_entry',
      'Trusted backend entry must export register(context).',
      422
    );
  }
  await moduleRef.register(context);
  if (typeof moduleRef.shutdown === 'function') {
    shutdowns.set(context.extensionId, moduleRef.shutdown);
  }
  logExtension('info', 'backend.executed', { extensionId: context.extensionId });
}

export async function shutdownTrustedBackend(extensionId: string): Promise<void> {
  const shutdown = shutdowns.get(extensionId);
  shutdowns.delete(extensionId);
  forgetRegistration(extensionId);
  if (!shutdown) return;
  try {
    await shutdown();
  } catch (error) {
    logExtension('error', 'backend.shutdown_failed', {
      extensionId,
      message: error instanceof Error ? error.message.split('\n')[0] : 'shutdown failed',
    });
  }
}
