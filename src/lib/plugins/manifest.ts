export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  type?: string;
  icon?: string;
  entryPoint?: string;
  styles?: string[];
  customElement?: string;
}

export interface ParsedPluginManifest extends PluginManifest {
  pluginId: string;
  entryPoint: string;
  styles: string[];
}

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{1,62}[a-z0-9]$/;
const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.msi',
  '.com',
  '.scr',
]);

export function sanitizePluginId(value: string): string {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!sanitized) return `plugin-${Date.now()}`;
  if (sanitized.length < 3) return `${sanitized}-plugin`;
  return sanitized.slice(0, 64);
}

export function isSafeRelativePath(filePath: string): boolean {
  if (!filePath || filePath.startsWith('/') || filePath.includes('\\')) return false;
  const segments = filePath.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

export function hasBlockedExtension(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return [...BLOCKED_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

export function parsePluginManifest(raw: unknown): ParsedPluginManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('manifest.json must be a JSON object');
  }

  const manifest = raw as PluginManifest;
  const name = typeof manifest.name === 'string' ? manifest.name.trim() : '';
  const version = typeof manifest.version === 'string' ? manifest.version.trim() : '';

  if (!name) throw new Error('manifest.json requires a non-empty "name"');
  if (!version) throw new Error('manifest.json requires a non-empty "version"');

  const pluginId = sanitizePluginId(
    typeof manifest.id === 'string' && manifest.id.trim() ? manifest.id : name
  );

  if (!PLUGIN_ID_PATTERN.test(pluginId)) {
    throw new Error(
      'manifest.json "id" must be 3-64 characters and use lowercase letters, numbers, hyphens, or underscores'
    );
  }

  const entryPoint =
    typeof manifest.entryPoint === 'string' && manifest.entryPoint.trim()
      ? manifest.entryPoint.trim()
      : 'index.js';

  if (!isSafeRelativePath(entryPoint)) {
    throw new Error('manifest.json "entryPoint" must be a safe relative path');
  }

  const styles = Array.isArray(manifest.styles)
    ? manifest.styles.filter((style): style is string => typeof style === 'string' && isSafeRelativePath(style))
    : [];

  if (manifest.customElement && typeof manifest.customElement !== 'string') {
    throw new Error('manifest.json "customElement" must be a string when provided');
  }

  return {
    ...manifest,
    pluginId,
    name,
    version,
    description: typeof manifest.description === 'string' ? manifest.description : '',
    author: typeof manifest.author === 'string' ? manifest.author : 'Unknown',
    type: typeof manifest.type === 'string' ? manifest.type : 'block',
    icon: typeof manifest.icon === 'string' ? manifest.icon : '🧩',
    entryPoint,
    styles,
    customElement: manifest.customElement?.trim() || undefined,
  };
}
