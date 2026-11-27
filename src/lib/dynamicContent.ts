import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Uploaded themes and plugins are NEVER stored under `public/`.
 * They live under `src/` and are served only through authenticated or
 * controlled API/asset routes — not as static Next.js public files.
 *
 * ZIP layout (plugins): `{pluginId}/{pluginId}/manifest.json`, `ui/`, optional `api/`
 *
 *   src/themes/[slug]/{slug}/                         — Theme Engine packages
 *   src/plugins/{pluginId}/{pluginId}/                — plugin ui/, manifest.json
 *   src/app/api/plugins/[pluginId]/{pluginId}/api/    — plugin backend from ZIP
 */

/** Reject any upload root that resolves inside `public/`. */
export function assertUploadPathNotInPublic(absolutePath: string, label: string): void {
  const resolved = path.resolve(absolutePath);
  const publicRoot = path.resolve(PUBLIC_DIR);
  const relative = path.relative(publicRoot, resolved);
  const insidePublic =
    relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  if (insidePublic) {
    throw new Error(
      `${label} must not be stored under public/. Use src/themes or src/plugins instead. Got: ${resolved}`
    );
  }
}

/** Theme Engine uploads: `src/themes/[slug]/` */
export const UPLOADED_THEMES_ROOT = path.join(process.cwd(), 'src', 'themes', '[slug]');

/** Plugin frontend uploads: `src/plugins/` (never `public/plugins/`) */
export const UPLOADED_PLUGINS_FRONTEND_ROOT = path.join(process.cwd(), 'src', 'plugins');

/** Plugin backend uploads: `src/app/api/plugins/[pluginId]/` */
export const UPLOADED_PLUGINS_BACKEND_ROOT = path.join(
  process.cwd(),
  'src',
  'app',
  'api',
  'plugins',
  '[pluginId]'
);

/** Extension packages: `src/extension-packages/` — never `public/`. */
export const UPLOADED_EXTENSIONS_ROOT = path.join(process.cwd(), 'src', 'extension-packages');

assertUploadPathNotInPublic(UPLOADED_THEMES_ROOT, 'Theme upload root');
assertUploadPathNotInPublic(UPLOADED_PLUGINS_FRONTEND_ROOT, 'Plugin frontend upload root');
assertUploadPathNotInPublic(UPLOADED_PLUGINS_BACKEND_ROOT, 'Plugin backend upload root');
assertUploadPathNotInPublic(UPLOADED_EXTENSIONS_ROOT, 'Extension package root');

/** Relative paths for DB metadata and docs. */
export const UPLOADED_THEMES_REL = 'src/themes/[slug]';
export const UPLOADED_PLUGINS_FRONTEND_REL = 'src/plugins';
export const UPLOADED_PLUGINS_BACKEND_REL = 'src/app/api/plugins/[pluginId]';
export const UPLOADED_EXTENSIONS_REL = 'src/extension-packages';

/** @deprecated Use UPLOADED_* constants. */
export const DYNAMIC_THEMES_DIR = UPLOADED_THEMES_ROOT;
export const DYNAMIC_PLUGINS_FRONTEND_DIR = UPLOADED_PLUGINS_FRONTEND_ROOT;
export const DYNAMIC_PLUGINS_BACKEND_DIR = UPLOADED_PLUGINS_BACKEND_ROOT;
export const DYNAMIC_THEMES_REL = UPLOADED_THEMES_REL;
export const DYNAMIC_PLUGINS_FRONTEND_REL = UPLOADED_PLUGINS_FRONTEND_REL;
export const DYNAMIC_PLUGINS_BACKEND_REL = UPLOADED_PLUGINS_BACKEND_REL;
