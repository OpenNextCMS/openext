import type { ThemeManifest, ThemeTemplateMeta, ThemeTemplateType } from './types';

/** Filename (without extension) → canonical template key. */
const FILE_KEY_MAP: Record<string, string> = {
  index: 'index',
  home: 'home',
  page: 'page',
  post: 'post',
  archive: 'archive',
  blog: 'blog',
  blogpost: 'blogPost',
  product: 'product',
  products: 'products',
  category: 'category',
  search: 'search',
  '404': '404',
  about: 'about',
  contact: 'contact',
};

/** Infer template type from key when not explicitly declared. */
const KEY_TYPE_MAP: Record<string, ThemeTemplateType> = {
  home: 'home',
  page: 'page',
  post: 'single',
  blogPost: 'single',
  product: 'single',
  products: 'archive',
  category: 'archive',
  blog: 'archive',
  archive: 'archive',
  search: 'search',
  '404': 'error',
  index: 'page',
};

function humanizeKey(key: string): string {
  if (key === '404') return '404';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function keyFromFilePath(filePath: string): string {
  const base = filePath.split('/').pop()?.replace(/\.tsx$/i, '') ?? '';
  return FILE_KEY_MAP[base.toLowerCase()] ?? base.replace(/([A-Z])/g, (m) => m.toLowerCase()).replace(/^./, (c) => c.toLowerCase());
}

function inferType(key: string, explicit?: ThemeTemplateType): ThemeTemplateType {
  if (explicit) return explicit;
  return KEY_TYPE_MAP[key] ?? 'custom';
}

/**
 * Build normalized template registry metadata from a validated manifest.
 * Supports legacy string paths and rich `{ name, file, type }` entries.
 */
export function extractTemplateMetadata(manifest: ThemeManifest): ThemeTemplateMeta[] {
  const seen = new Set<string>();
  const out: ThemeTemplateMeta[] = [];

  const registry = manifest.templateRegistry ?? [];
  const registryByKey = new Map(registry.map((t) => [t.key, t]));

  for (const [key, value] of Object.entries(manifest.templates)) {
    if (!value || typeof value !== 'string') continue;
    const reg = registryByKey.get(key);
    const file = value;
    out.push({
      key,
      name: reg?.name ?? humanizeKey(key),
      file,
      type: inferType(key, reg?.type),
    });
    seen.add(key);
  }

  for (const reg of registry) {
    if (seen.has(reg.key)) continue;
    if (!reg.file) continue;
    out.push({
      key: reg.key,
      name: reg.name,
      file: reg.file,
      type: inferType(reg.key, reg.type),
    });
    seen.add(reg.key);
  }

  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/** Merge auto-discovered template paths with manifest declarations. */
export function mergeDiscoveredTemplates(
  manifest: ThemeManifest,
  discovered: Record<string, string>
): ThemeManifest {
  const templates = { ...manifest.templates };
  const registry = [...(manifest.templateRegistry ?? [])];
  const registryKeys = new Set(registry.map((t) => t.key));

  for (const [filePath, _key] of Object.entries(discovered)) {
    const key = keyFromFilePath(filePath);
    if (!templates[key]) {
      templates[key] = filePath;
      if (!registryKeys.has(key)) {
        registry.push({
          key,
          name: humanizeKey(key),
          file: filePath,
          type: inferType(key),
        });
        registryKeys.add(key);
      }
    }
  }

  if (!templates.index && templates.home) {
    templates.index = templates.home;
  } else if (!templates.index) {
    const first = Object.entries(templates).find(([, p]) => p);
    if (first) templates.index = first[1]!;
  }

  return { ...manifest, templates, templateRegistry: registry };
}

export { FILE_KEY_MAP, KEY_TYPE_MAP, keyFromFilePath, humanizeKey, inferType };
