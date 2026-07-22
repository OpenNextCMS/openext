import { createRequire } from 'node:module';
import path from 'node:path';

declare const __non_webpack_require__: NodeRequire | undefined;
declare const __filename: string;

/**
 * Node require that bypasses Webpack's static analysis.
 * Next.js bundles API routes; uploaded plugin files must load via native require.
 */
function getNativeRequire(): NodeRequire {
  if (typeof __non_webpack_require__ === 'function') {
    return __non_webpack_require__;
  }
  return createRequire(__filename);
}

/**
 * Load a CommonJS file from an absolute path at runtime.
 *
 * Used exclusively for uploaded plugin code under plugins/{id}/.
 */
export function loadCjsModule(absolutePath: string): unknown {
  const resolved = path.resolve(absolutePath);
  const nativeRequire = getNativeRequire();
  return nativeRequire(resolved);
}

export function clearCjsModuleCache(absolutePath: string): void {
  const resolved = path.resolve(absolutePath);
  try {
    const nativeRequire = getNativeRequire();
    const cacheKey = nativeRequire.resolve(resolved);
    if (nativeRequire.cache[cacheKey]) {
      delete nativeRequire.cache[cacheKey];
    }
  } catch {
    // Module may not be cached yet
  }
}
