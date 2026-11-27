export {
  EXTENSION_CAPABILITIES,
  EXTENSION_SDK_VERSION,
  EXTENSION_STATUSES,
  getCmsVersion,
  type ExtensionCapability,
  type ExtensionStatus,
} from '@/lib/extensions/constants';
export type {
  ExtensionContext,
  ExtensionHostAdapter,
  ExtensionMigrationContext,
  ExtensionRegistration,
} from '@/lib/extensions/contracts';
export { ExtensionError } from '@/lib/extensions/errors';
export {
  attachPluginExtensionHost,
  clearExtensionHostsForTests,
  detachPluginExtensionHost,
  getExtensionHost,
  listExtensionHosts,
  registerExtensionHost,
} from '@/lib/extensions/hostRegistry';
export { extensionManifestSchema, type ExtensionManifest } from '@/lib/extensions/schema';
export { defineExtensionHost } from '@/lib/extensions/defineHost';
