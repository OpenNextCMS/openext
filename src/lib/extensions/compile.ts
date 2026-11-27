import ts from 'typescript';
import type { ExtensionManifest } from '@/lib/extensions/schema';
import { ExtensionError } from '@/lib/extensions/errors';

type CompileTarget = 'backend' | 'frontend';

export function isTypeScriptFile(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return (lower.endsWith('.ts') || lower.endsWith('.tsx')) && !lower.endsWith('.d.ts');
}

export function toCompiledJsPath(relativePath: string): string {
  return relativePath.replace(/\.(tsx|ts)$/i, '.js');
}

function rewriteEntryPath(value: string | undefined): string | undefined {
  if (!value) return value;
  return isTypeScriptFile(value) ? toCompiledJsPath(value) : value;
}

function compileTargetForPath(relativePath: string): CompileTarget {
  if (relativePath.startsWith('server/') || relativePath.startsWith('migrations/')) {
    return 'backend';
  }
  return 'frontend';
}

function compilerOptions(target: CompileTarget): ts.TranspileOptions['compilerOptions'] {
  return {
    target: ts.ScriptTarget.ES2020,
    module: target === 'backend' ? ts.ModuleKind.CommonJS : ts.ModuleKind.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    sourceMap: false,
    inlineSources: false,
    removeComments: false,
  };
}

function transpileSource(relativePath: string, source: string, target: CompileTarget): string {
  const result = ts.transpileModule(source, {
    compilerOptions: compilerOptions(target),
    fileName: relativePath,
    reportDiagnostics: true,
  });

  const errors = result.diagnostics?.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors?.length) {
    const details = errors
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      .join('; ');
    throw new ExtensionError(
      'compile_failed',
      `TypeScript compile failed for "${relativePath}": ${details}`,
      400
    );
  }

  return result.outputText;
}

/**
 * Rewrites TypeScript entry and contribution paths to their compiled `.js` siblings.
 * The stored registry always points at runtime-loadable files.
 */
export function rewriteExtensionManifest(manifest: ExtensionManifest): ExtensionManifest {
  const contributions = manifest.contributions
    ? {
        ...manifest.contributions,
        navigation: manifest.contributions.navigation?.map((item) => ({
          ...item,
          href: rewriteEntryPath(item.href) || item.href,
        })),
        pages: manifest.contributions.pages?.map((item) => ({
          ...item,
          entry: rewriteEntryPath(item.entry) || item.entry,
        })),
      }
    : undefined;

  return {
    ...manifest,
    entry: manifest.entry
      ? {
          frontend: rewriteEntryPath(manifest.entry.frontend),
          backend: rewriteEntryPath(manifest.entry.backend),
        }
      : undefined,
    migrations: rewriteEntryPath(manifest.migrations) ?? manifest.migrations,
    contributions,
  };
}

/**
 * Transpiles `.ts` / `.tsx` files in an inspected package map.
 * Adds sibling `.js` buffers; keeps sources for inspection.
 * This is a transpile, not a bundler — npm imports still require a pre-built package.
 */
export function compileExtensionEntries(
  entries: Map<string, Buffer>,
  manifest: ExtensionManifest
): { entries: Map<string, Buffer>; manifest: ExtensionManifest; compiled: string[] } {
  const next = new Map(entries);
  const compiled: string[] = [];

  for (const [relativePath, content] of entries) {
    if (!isTypeScriptFile(relativePath)) continue;
    const target = compileTargetForPath(relativePath);
    const outputRelativePath = toCompiledJsPath(relativePath);
    const outputText = transpileSource(relativePath, content.toString('utf8'), target);
    next.set(outputRelativePath, Buffer.from(outputText, 'utf8'));
    compiled.push(outputRelativePath);
  }

  // Persist the rewritten manifest.json so rollback / file reads match the registry.
  const rewritten = rewriteExtensionManifest(manifest);
  next.set('manifest.json', Buffer.from(JSON.stringify(rewritten, null, 2), 'utf8'));

  return { entries: next, manifest: rewritten, compiled };
}
