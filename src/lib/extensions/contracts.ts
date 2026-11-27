import type { ExtensionCapability } from '@/lib/extensions/constants';
import type { ExtensionManifest } from '@/lib/extensions/schema';

/**
 * Declarations a target plugin receives when an extension is enabled.
 * The host decides how to apply them. The CMS does not invent CRM, cart,
 * or form concepts here.
 */
export interface ExtensionRegistration {
  extensionId: string;
  version: string;
  targetPluginId: string;
  capabilities: ExtensionCapability[];
  permissions: string[];
  contributions: ExtensionManifest['contributions'];
  entry?: ExtensionManifest['entry'];
}

export interface ExtensionHostAdapter {
  pluginId: string;
  /** Semantic version range of the extension SDK this host implements. */
  sdkVersion: string;
  capabilities: ExtensionCapability[];
  registerExtension(registration: ExtensionRegistration): void | Promise<void>;
  unregisterExtension(extensionId: string): void | Promise<void>;
}

/** Limited context passed to a trusted extension backend. Not a sandbox. */
export interface ExtensionContext {
  extensionId: string;
  targetPluginId: string;
  version: string;
  capabilities: ExtensionCapability[];
  logger: {
    info: (message: string, fields?: Record<string, unknown>) => void;
    warn: (message: string, fields?: Record<string, unknown>) => void;
    error: (message: string, fields?: Record<string, unknown>) => void;
  };
  permissions: {
    list: () => string[];
    has: (permission: string) => boolean;
  };
  navigation: {
    register: (item: { id: string; label: string; href: string }) => void;
  };
  pages: {
    register: (page: { id: string; title: string; entry: string }) => void;
  };
  api: {
    register: (route: { method: string; path: string }) => void;
  };
  events: {
    subscribe: (name: string, handler: (payload?: unknown) => void) => void;
  };
  settings: {
    register: (setting: { key: string; label: string; type: string }) => void;
  };
  fields: {
    register: (field: { id: string; label: string; fieldType: string }) => void;
  };
  workflows: {
    register: (workflow: { id: string; label: string }) => void;
  };
  health: {
    report: (status: 'healthy' | 'degraded' | 'error', message?: string) => void;
  };
}

export interface ExtensionMigrationContext {
  extensionId: string;
  version: string;
  logger: ExtensionContext['logger'];
  /**
   * Registers a model namespaced to this extension.
   * Trusted migrations only. The CMS does not hand over environment variables,
   * filesystem access, or permission-approval APIs.
   */
  models: {
    register: (name: string, schema: unknown) => Promise<unknown>;
  };
}
