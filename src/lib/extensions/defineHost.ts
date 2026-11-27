import type { ExtensionHostAdapter } from '@/lib/extensions/contracts';

/**
 * Identity helper so in-repo TypeScript plugins can type an `extensionHost` export.
 * Uploaded JavaScript plugins can export a plain object with the same shape.
 */
export function defineExtensionHost(adapter: ExtensionHostAdapter): ExtensionHostAdapter {
  return adapter;
}
