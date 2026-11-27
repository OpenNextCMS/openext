import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import type { ParsedPluginManifest } from '@/lib/plugins/manifest';

type CompileTarget = 'backend' | 'frontend';

export interface PluginCompileResult {
  relativePaths: string[];
  manifest: ParsedPluginManifest;
}

function isTypeScriptFile(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return (lower.endsWith('.ts') || lower.endsWith('.tsx')) && !lower.endsWith('.d.ts');
}

function toCompiledJsPath(relativePath: string): string {
  return relativePath.replace(/\.(tsx|ts)$/i, '.js');
}

function rewriteEntryPath(value: string | undefined): string | undefined {
  if (!value) return value;
  return isTypeScriptFile(value) ? toCompiledJsPath(value) : value;
}

function rewritePathList(values: string[] | undefined): string[] | undefined {
  if (!Array.isArray(values)) return values;
  return values.map((value) => rewriteEntryPath(value) || value);
}

function rewriteManifestPaths(manifest: ParsedPluginManifest): ParsedPluginManifest {
  return {
    ...manifest,
    entryPoint: rewriteEntryPath(manifest.entryPoint),
    adminEntry: rewriteEntryPath(manifest.adminEntry),
    adminMount: rewriteEntryPath(manifest.adminMount),
    adminNav: manifest.adminNav?.map((item) => ({
      ...item,
      entry: rewriteEntryPath(item.entry) || item.entry,
    })),
    blockEntry: rewriteEntryPath(manifest.blockEntry),
    serverEntry: rewriteEntryPath(manifest.serverEntry),
    installHook: rewriteEntryPath(manifest.installHook),
    uninstallHook: rewriteEntryPath(manifest.uninstallHook),
    styles: rewritePathList(manifest.styles) || [],
    migrations: rewritePathList(manifest.migrations),
    models: rewritePathList(manifest.models),
  };
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

async function compileTypeScriptFile(
  rootDir: string,
  relativePath: string,
  target: CompileTarget
): Promise<string> {
  const inputPath = path.join(rootDir, relativePath);
  const outputRelativePath = toCompiledJsPath(relativePath);
  const outputPath = path.join(rootDir, outputRelativePath);
  const source = await fs.readFile(inputPath, 'utf8');
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
    throw new Error(`TypeScript compile failed for "${relativePath}": ${details}`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, result.outputText, 'utf8');
  return outputRelativePath;
}

export async function compilePluginTypeScript(options: {
  frontendDir: string;
  backendDir: string;
  manifest: ParsedPluginManifest;
  relativePaths: string[];
}): Promise<PluginCompileResult> {
  const compiledPaths = new Set(options.relativePaths);

  for (const relativePath of options.relativePaths) {
    if (!isTypeScriptFile(relativePath)) continue;

    const target: CompileTarget =
      relativePath === 'package.json' ||
      relativePath.startsWith('api/') ||
      relativePath.startsWith('server/')
        ? 'backend'
        : 'frontend';
    const rootDir = target === 'backend' ? options.backendDir : options.frontendDir;
    const outputRelativePath = await compileTypeScriptFile(rootDir, relativePath, target);
    compiledPaths.add(outputRelativePath);
  }

  return {
    relativePaths: [...compiledPaths],
    manifest: rewriteManifestPaths(options.manifest),
  };
}
