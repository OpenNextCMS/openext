import semver from 'semver';
import {
  EXTENSION_CAPABILITIES,
  EXTENSION_ID_PATTERN,
  type ExtensionCapability,
} from '@/lib/extensions/constants';
import type { ExtensionHostAdapter, ExtensionRegistration } from '@/lib/extensions/contracts';
import { logExtension } from '@/lib/extensions/logger';

const hosts = new Map<string, ExtensionHostAdapter>();
const registrations = new Map<string, ExtensionRegistration>();

export function isExtensionHostAdapter(value: unknown): value is ExtensionHostAdapter {
  if (!value || typeof value !== 'object') return false;
  const host = value as Partial<ExtensionHostAdapter>;
  if (typeof host.pluginId !== 'string' || !EXTENSION_ID_PATTERN.test(host.pluginId)) return false;
  if (typeof host.sdkVersion !== 'string' || semver.validRange(host.sdkVersion) === null) return false;
  if (!Array.isArray(host.capabilities) || host.capabilities.length === 0) return false;
  if (!host.capabilities.every((capability) => EXTENSION_CAPABILITIES.includes(capability as ExtensionCapability))) {
    return false;
  }
  if (typeof host.registerExtension !== 'function' || typeof host.unregisterExtension !== 'function') {
    return false;
  }
  return true;
}

export function registerExtensionHost(adapter: ExtensionHostAdapter): void {
  if (!isExtensionHostAdapter(adapter)) {
    throw new Error(`Plugin "${String((adapter as { pluginId?: string })?.pluginId || '')}" did not provide a valid extension host.`);
  }
  hosts.set(adapter.pluginId, adapter);
  logExtension('info', 'host.registered', {
    pluginId: adapter.pluginId,
    sdkVersion: adapter.sdkVersion,
    capabilities: adapter.capabilities,
  });
}

export function unregisterExtensionHost(pluginId: string): void {
  hosts.delete(pluginId);
  for (const [extensionId, registration] of registrations) {
    if (registration.targetPluginId === pluginId) registrations.delete(extensionId);
  }
  logExtension('info', 'host.unregistered', { pluginId });
}

export function getExtensionHost(pluginId: string): ExtensionHostAdapter | undefined {
  return hosts.get(pluginId);
}

export function listExtensionHosts(): Array<Pick<ExtensionHostAdapter, 'pluginId' | 'sdkVersion' | 'capabilities'>> {
  return [...hosts.values()].map((host) => ({
    pluginId: host.pluginId,
    sdkVersion: host.sdkVersion,
    capabilities: [...host.capabilities],
  }));
}

export function rememberRegistration(registration: ExtensionRegistration): void {
  registrations.set(registration.extensionId, registration);
}

export function forgetRegistration(extensionId: string): void {
  registrations.delete(extensionId);
}

export function getRegistration(extensionId: string): ExtensionRegistration | undefined {
  return registrations.get(extensionId);
}

/**
 * Called by the plugin loader when a backend module optionally exports `extensionHost`.
 * Plugins that omit it are unchanged.
 */
export async function attachPluginExtensionHost(
  pluginId: string,
  moduleHost: unknown
): Promise<'skipped' | 'registered' | 'mismatch' | 'invalid'> {
  if (moduleHost == null) return 'skipped';
  if (!isExtensionHostAdapter(moduleHost)) {
    logExtension('warn', 'host.invalid', { pluginId });
    return 'invalid';
  }
  if (moduleHost.pluginId !== pluginId) {
    logExtension('warn', 'host.mismatch', { pluginId, declared: moduleHost.pluginId });
    return 'mismatch';
  }
  registerExtensionHost(moduleHost);
  return 'registered';
}

export function detachPluginExtensionHost(pluginId: string): void {
  if (!hosts.has(pluginId)) return;
  unregisterExtensionHost(pluginId);
}

/** Test isolation. Production code should not call this. */
export function clearExtensionHostsForTests(): void {
  hosts.clear();
  registrations.clear();
}
