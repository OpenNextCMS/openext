import { assetUrl } from '@/lib/apiClient';

export interface PluginMountContext {
  pluginId: string;
  pageId?: string;
  roleId?: string;
  features: string[] | '*';
  /** Base path for plugin static assets, e.g. /plugins/{id}/ */
  assetBase: string;
  /** Base path for plugin data API, e.g. /api/plugins/{id}/ */
  apiBase: string;
  /** When set, this mount is an extension page inside the plugin shell. */
  extensionId?: string;
}

export type PluginMountResult = void | { unmount?: () => void | Promise<void> };

export interface PluginMountModule {
  mount: (el: HTMLElement, ctx: PluginMountContext) => PluginMountResult | Promise<PluginMountResult>;
  unmount?: () => void | Promise<void>;
}

/**
 * Turn a stored adminMount / adminNav entry into a same-origin module URL.
 * Accepts public `/plugins/{id}/...` paths or package-relative paths.
 */
export function resolvePluginMountModuleUrl(pluginId: string, mountEntry: string): string {
  const raw = mountEntry.trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/plugins/')) return assetUrl(raw);
  if (raw.startsWith('/extensions/')) return assetUrl(raw);
  return assetUrl(`/plugins/${encodeURIComponent(pluginId)}/${raw.replace(/^\/+/, '')}`);
}

/** Extension package mount module under /extensions/{extensionId}/... */
export function resolveExtensionMountModuleUrl(extensionId: string, entry: string): string {
  const raw = entry.trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/extensions/')) return assetUrl(raw);
  const encodedEntry = raw
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return assetUrl(`/extensions/${encodeURIComponent(extensionId)}/${encodedEntry}`);
}

export function buildPluginMountContext(options: {
  pluginId: string;
  pageId?: string;
  roleId?: string;
  features: string[] | '*';
  extensionId?: string;
}): PluginMountContext {
  const { pluginId, pageId, roleId, features, extensionId } = options;
  return {
    pluginId,
    pageId,
    roleId,
    features,
    assetBase: `/plugins/${encodeURIComponent(pluginId)}/`,
    apiBase: `/api/plugins/${encodeURIComponent(pluginId)}/`,
    extensionId,
  };
}

/**
 * Dynamically import an ESM mount module from a same-origin URL.
 * Uses webpackIgnore so Next does not try to bundle arbitrary plugin paths.
 */
export async function loadPluginMountModule(moduleUrl: string): Promise<PluginMountModule> {
  if (!moduleUrl) {
    throw new Error('Missing mount module URL');
  }

  // Resolve to an absolute same-origin URL so the browser loads it as a real ESM
  // module (and relative imports like ./shared.js resolve against /plugins/...).
  const absoluteUrl =
    typeof window !== 'undefined'
      ? new URL(moduleUrl, window.location.origin).href
      : moduleUrl;

  let mod: {
    mount?: PluginMountModule['mount'];
    unmount?: PluginMountModule['unmount'];
    default?: {
      mount?: PluginMountModule['mount'];
      unmount?: PluginMountModule['unmount'];
    };
  };

  try {
    mod = (await import(
      /* webpackIgnore: true */
      /* @vite-ignore */
      /* turbopackIgnore: true */
      absoluteUrl
    )) as typeof mod;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to load mount module from ${absoluteUrl}. ${detail} Ensure the file is ESM and exports mount().`
    );
  }

  const candidate =
    typeof mod.mount === 'function'
      ? mod
      : typeof mod.default?.mount === 'function'
        ? mod.default
        : null;
  if (!candidate || typeof candidate.mount !== 'function') {
    throw new Error(
      'This plugin does not export mount(). Rebuild it for the Mount API (manifest.adminMount).'
    );
  }
  return candidate as PluginMountModule;
}

export async function invokeUnmount(
  handle: PluginMountResult | undefined,
  mod: PluginMountModule | undefined
): Promise<void> {
  try {
    if (handle && typeof handle === 'object' && typeof handle.unmount === 'function') {
      await handle.unmount();
      return;
    }
    if (mod && typeof mod.unmount === 'function') {
      await mod.unmount();
    }
  } catch {
    // Best-effort cleanup when switching pages or leaving the runtime.
  }
}

/** Resolve relative url(...) values against the stylesheet's own URL. */
export function rewriteCssUrls(css: string, stylesheetHref: string): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote: string, raw: string) => {
    const value = raw.trim();
    if (
      !value ||
      value.startsWith('data:') ||
      value.startsWith('blob:') ||
      value.startsWith('#') ||
      /^[a-z]+:/i.test(value) ||
      value.startsWith('//') ||
      value.startsWith('/')
    ) {
      return match;
    }
    try {
      const absolute = new URL(value, stylesheetHref).href;
      return `url(${quote}${absolute}${quote})`;
    } catch {
      return match;
    }
  });
}

/**
 * Load a plugin stylesheet and inject it scoped to `#plugin-root` so unscoped
 * rules (e.g. `button { background }`) cannot restyle the CMS sidebar/chrome.
 */
export async function injectPluginScopedStyles(
  href: string,
  scopeSelector = '#plugin-root'
): Promise<HTMLStyleElement> {
  const absoluteHref =
    typeof window !== 'undefined' ? new URL(href, window.location.origin).href : href;
  const response = await fetch(absoluteHref, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to load plugin stylesheet (${response.status}): ${absoluteHref}`);
  }
  const css = rewriteCssUrls(await response.text(), absoluteHref);
  const style = document.createElement('style');
  style.setAttribute('data-plugin-scoped-style', scopeSelector);
  style.setAttribute('data-plugin-style-href', absoluteHref);
  style.textContent = `@scope (${scopeSelector}) {\n${css}\n}`;
  document.head.appendChild(style);
  return style;
}
