import fs from 'fs/promises';
import path from 'path';
import type { ThemeManifestPartials } from '../types';
import { createEmptyRegistry } from './createEmptyRegistry';
import type { ThemeRuntimeRegistry } from './types';

const TEMPLATE_NAME_MAP: Record<string, string> = {
  index: 'index',
  home: 'home',
  page: 'page',
  post: 'post',
  archive: 'archive',
};

const PARTIAL_NAME_MAP: Record<string, keyof ThemeManifestPartials> = {
  header: 'header',
  footer: 'footer',
  sidebar: 'sidebar',
};

/**
 * Convention-over-configuration: scan standard theme folders and populate a registry
 * without executing theme.ts. Explicit registrations in theme.ts override these.
 */
export async function autoDiscover(root: string): Promise<ThemeRuntimeRegistry> {
  const registry = createEmptyRegistry();

  await discoverTemplates(root, registry);
  await discoverPartials(root, registry);
  await discoverBlocks(root, registry);
  await discoverAssets(root, registry);

  return registry;
}

async function discoverTemplates(root: string, registry: ThemeRuntimeRegistry): Promise<void> {
  const dir = path.join(root, 'templates');
  const files = await listTsx(dir);
  for (const rel of files) {
    const base = path.basename(rel, '.tsx');
    const key = TEMPLATE_NAME_MAP[base.toLowerCase()] ?? base.toLowerCase();
    if (!registry.templates[key]) {
      registry.templates[key] = { key, path: rel };
    }
  }
}

async function discoverPartials(root: string, registry: ThemeRuntimeRegistry): Promise<void> {
  const dir = path.join(root, 'partials');
  const files = await listTsx(dir);
  for (const rel of files) {
    const base = path.basename(rel, '.tsx');
    const key = PARTIAL_NAME_MAP[base.toLowerCase()];
    if (key && !registry.partials[key]) {
      registry.partials[key] = { key, path: rel };
    }
  }
}

async function discoverBlocks(root: string, registry: ThemeRuntimeRegistry): Promise<void> {
  const dir = path.join(root, 'blocks');
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }

  for (const name of entries) {
    const blockDir = path.join(dir, name);
    let st;
    try {
      st = await fs.stat(blockDir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    const rendererRel = `blocks/${name}/Renderer.tsx`;
    const schemaRel = `blocks/${name}/schema.ts`;
    const type = kebabCase(name);

    const hasRenderer = await fileExists(path.join(root, rendererRel));
    if (!hasRenderer) continue;

    const hasSchema = await fileExists(path.join(root, schemaRel));
    registry.blocks[type] = {
      type,
      label: name,
      rendererPath: rendererRel,
      schemaPath: hasSchema ? schemaRel : undefined,
    };
  }
}

async function discoverAssets(root: string, registry: ThemeRuntimeRegistry): Promise<void> {
  const stylePath = path.join(root, 'assets', 'style.css');
  const scriptPath = path.join(root, 'assets', 'theme.js');
  if (await fileExists(stylePath)) {
    registry.assets.push({ kind: 'style', path: 'assets/style.css' });
  }
  if (await fileExists(scriptPath)) {
    registry.assets.push({ kind: 'script', path: 'assets/theme.js' });
  }

  const fontsDir = path.join(root, 'assets', 'fonts');
  try {
    const fonts = await fs.readdir(fontsDir);
    for (const f of fonts) {
      const ext = path.extname(f).toLowerCase();
      if (['.woff', '.woff2', '.ttf'].includes(ext)) {
        registry.assets.push({ kind: 'font', path: `assets/fonts/${f}` });
      }
    }
  } catch {
    // optional
  }
}

async function listTsx(dir: string): Promise<string[]> {
  try {
    const folderName = path.basename(dir);
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => `${folderName}/${f}`.replace(/\\/g, '/'));
  } catch {
    return [];
  }
}

async function fileExists(abs: string): Promise<boolean> {
  try {
    return (await fs.stat(abs)).isFile();
  } catch {
    return false;
  }
}

function kebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
