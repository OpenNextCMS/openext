import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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
  // Prefer project root — webpack's __filename breaks absolute paths with [brackets].
  try {
    return createRequire(path.join(process.cwd(), 'package.json'));
  } catch {
    return createRequire(__filename);
  }
}

/**
 * Evaluate a CommonJS file without Node's module path resolver.
 * Needed when the path contains Next.js dynamic segments like `[pluginId]`.
 */
function loadCjsViaVm(absolutePath: string): unknown {
  const code = fs.readFileSync(absolutePath, 'utf8');
  const cjsModule = { exports: {} as Record<string, unknown> };
  const dirname = path.dirname(absolutePath);
  const nativeRequire = getNativeRequire();
  const script = new vm.Script(
    `(function (exports, require, module, __filename, __dirname) {\n${code}\n})`,
    { filename: absolutePath }
  );
  const runner = script.runInThisContext() as (
    exports: Record<string, unknown>,
    require: NodeRequire,
    moduleArg: { exports: Record<string, unknown> },
    filename: string,
    dirname: string
  ) => void;
  runner(cjsModule.exports, nativeRequire, cjsModule, absolutePath, dirname);
  return cjsModule.exports;
}

/**
 * Load a CommonJS file from an absolute path at runtime.
 *
 * Used exclusively for uploaded plugin code under plugins/{id}/.
 */
export function loadCjsModule(absolutePath: string): unknown {
  const resolved = path.resolve(absolutePath);
  const nativeRequire = getNativeRequire();

  try {
    return nativeRequire(resolved);
  } catch (err) {
    // Paths with `[pluginId]` / `[slug]` confuse some bundled resolvers — evaluate directly.
    if (fs.existsSync(resolved)) {
      return loadCjsViaVm(resolved);
    }
    throw err;
  }
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
    // Module may not be cached yet (or path is not require-resolvable)
  }
}

/** Drop all cached CommonJS modules under a plugin backend directory (after file updates). */
export function clearPluginDirectoryModuleCache(pluginDir: string): void {
  const nativeRequire = getNativeRequire();
  const normalizedDir = path.resolve(pluginDir).toLowerCase();

  for (const cacheKey of Object.keys(nativeRequire.cache)) {
    if (path.resolve(cacheKey).toLowerCase().startsWith(normalizedDir)) {
      delete nativeRequire.cache[cacheKey];
    }
  }
}
