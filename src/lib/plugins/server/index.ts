export { bootstrapBackendPlugins, ensureBackendPluginsBootstrapped } from '@/lib/plugins/server/bootstrap';
export { loadBackendPlugin, unloadBackendPlugin, reloadBackendPlugin } from '@/lib/plugins/server/loader';
export {
  installBackendPlugin,
  enableBackendPlugin,
  disableBackendPlugin,
  uninstallBackendPlugin,
  rollbackPluginInstall,
} from '@/lib/plugins/server/lifecycle';
export { runPluginMigrations, getPluginMigrationHistory } from '@/lib/plugins/server/migrations';
export { PluginApp } from '@/lib/plugins/server/router';
export { createCmsSdk, createAuthMiddleware } from '@/lib/plugins/server/sdk';
export type { CmsSdk } from '@/lib/plugins/server/sdk';
export type {
  PluginRequest,
  PluginResponse,
  PluginHandler,
  PluginServerModule,
  PluginRegisterContext,
} from '@/lib/plugins/server/types';
