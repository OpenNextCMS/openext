import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';
import ts from 'typescript';
import { manifestParser, type ManifestParser } from './ManifestParser';
import { ManifestValidationError } from './errors';
import {
  ALLOWED_EXTENSIONS,
  BLOCKS_DIR,
  CMS_VERSION,
  isAllowedTsPath,
  MANIFEST_FILENAME,
  MAX_UNPACKED_BYTES,
} from './config';
import { themeBootstrap } from './registration/ThemeBootstrap';
import type { ThemeManifest, ThemeValidationIssue, ThemeValidationResult } from './types';

/**
 * §4.2 ThemeValidator — validate an EXTRACTED theme directory as a whole.
 *
 * Runs all 8 spec checks and COLLECTS every failure rather than short-circuiting,
 * so an author sees every problem in one pass.
 *
 * Never executes theme code: the component check uses the TypeScript compiler API
 * to parse an AST. No `eval`, no `require`, no dynamic import of uploaded files.
 */

export interface ThemeValidatorOptions {
  /** Version that `manifest.compatibleCmsVersion` is checked against. */
  currentCmsVersion?: string;
  /** Total unpacked size cap in bytes. */
  maxUnpackedBytes?: number;
}

/** Error/warning codes emitted by this module. */
export const ValidationCode = {
  ROOT_NOT_A_DIRECTORY: 'ROOT_NOT_A_DIRECTORY',
  EMPTY_PACKAGE: 'EMPTY_PACKAGE',
  MANIFEST_MISSING: 'MANIFEST_MISSING',
  MANIFEST_NOT_JSON: 'MANIFEST_NOT_JSON',
  MANIFEST_INVALID: 'MANIFEST_INVALID',
  MANIFEST_UNKNOWN_KEY: 'MANIFEST_UNKNOWN_KEY',
  CMS_INCOMPATIBLE: 'CMS_INCOMPATIBLE',
  INDEX_TEMPLATE_MISSING: 'INDEX_TEMPLATE_MISSING',
  DECLARED_FILE_MISSING: 'DECLARED_FILE_MISSING',
  PATH_ESCAPE: 'PATH_ESCAPE',
  SYMLINK_INSIDE: 'SYMLINK_INSIDE',
  DISALLOWED_EXTENSION: 'DISALLOWED_EXTENSION',
  DISALLOWED_JSON: 'DISALLOWED_JSON',
  DISALLOWED_TS_LOCATION: 'DISALLOWED_TS_LOCATION',
  COMPONENT_SYNTAX_ERROR: 'COMPONENT_SYNTAX_ERROR',
  COMPONENT_NO_DEFAULT_EXPORT: 'COMPONENT_NO_DEFAULT_EXPORT',
  COMPONENT_DEFAULT_NOT_COMPONENT: 'COMPONENT_DEFAULT_NOT_COMPONENT',
  COMPONENT_UNVERIFIABLE: 'COMPONENT_UNVERIFIABLE',
  PACKAGE_TOO_LARGE: 'PACKAGE_TOO_LARGE',
  UNREADABLE_FILE: 'UNREADABLE_FILE',
  EDITABLE_SECTION_UNKNOWN_BLOCK: 'EDITABLE_SECTION_UNKNOWN_BLOCK',
  EDITABLE_SECTION_DUPLICATE_ID: 'EDITABLE_SECTION_DUPLICATE_ID',
  EDITABLE_SECTION_MISSING_SCHEMA: 'EDITABLE_SECTION_MISSING_SCHEMA',
  REGISTRATION_INVALID: 'REGISTRATION_INVALID',
} as const;

interface WalkedFile {
  /** Absolute path on disk. */
  abs: string;
  /** Posix path relative to the package root. */
  rel: string;
  size: number;
  isSymlink: boolean;
}

/** True when `candidate` resolves inside `root` (path.resolve + relative, not string matching). */
function isInside(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export class ThemeValidator {
  private readonly currentCmsVersion: string;
  private readonly maxUnpackedBytes: number;

  constructor(
    private readonly parser: ManifestParser = manifestParser,
    options: ThemeValidatorOptions = {}
  ) {
    this.currentCmsVersion = options.currentCmsVersion ?? CMS_VERSION;
    this.maxUnpackedBytes = options.maxUnpackedBytes ?? MAX_UNPACKED_BYTES;
  }

  async validate(extractedPath: string): Promise<ThemeValidationResult> {
    const errors: ThemeValidationIssue[] = [];
    const warnings: ThemeValidationIssue[] = [];
    const root = path.resolve(extractedPath);

    // ---- 0. root must be a readable directory -------------------------------
    try {
      const st = await fs.stat(root);
      if (!st.isDirectory()) {
        errors.push({ code: ValidationCode.ROOT_NOT_A_DIRECTORY, message: `"${extractedPath}" is not a directory.` });
        return { valid: false, errors, warnings };
      }
    } catch {
      errors.push({ code: ValidationCode.ROOT_NOT_A_DIRECTORY, message: `"${extractedPath}" does not exist or is unreadable.` });
      return { valid: false, errors, warnings };
    }

    // ---- 1. manifest exists and parses --------------------------------------
    const manifest = await this.readManifest(root, errors, warnings);

    // ---- walk the package (needed for checks 5, 6, 7, 8) ---------------------
    const files = await this.walk(root, root, errors);
    if (files.length === 0) {
      errors.push({ code: ValidationCode.EMPTY_PACKAGE, message: 'The theme package contains no files.' });
    }

    // ---- 5. no file resolves outside the package root ------------------------
    for (const f of files) {
      if (!isInside(root, f.abs)) {
        errors.push({ code: ValidationCode.PATH_ESCAPE, message: 'Resolves outside the package root (directory traversal).', file: f.rel });
        continue;
      }
      if (f.isSymlink) {
        let target: string | null = null;
        try {
          target = await fs.realpath(f.abs);
        } catch {
          target = null;
        }
        if (target === null || !isInside(root, target)) {
          errors.push({
            code: ValidationCode.PATH_ESCAPE,
            message: `Symlink points outside the package root${target ? ` (→ ${target})` : ''}.`,
            file: f.rel,
          });
        } else {
          warnings.push({ code: ValidationCode.SYMLINK_INSIDE, message: 'Symlink inside the package; resolved but discouraged.', file: f.rel });
        }
      }
    }

    // ---- 6. file-extension whitelist ----------------------------------------
    for (const f of files) {
      const ext = path.extname(f.rel).toLowerCase();
      if (ext === '.json') {
        if (f.rel !== MANIFEST_FILENAME) {
          errors.push({
            code: ValidationCode.DISALLOWED_JSON,
            message: `Only "${MANIFEST_FILENAME}" may be a .json file (manifest only).`,
            file: f.rel,
          });
        }
      } else if (ext === '.ts') {
        if (!isAllowedTsPath(f.rel)) {
          errors.push({
            code: ValidationCode.DISALLOWED_TS_LOCATION,
            message: `.ts is only allowed for theme.ts, block schemas (under "${BLOCKS_DIR}/"), editor/, hooks/, middleware/, or providers/.`,
            file: f.rel,
          });
        }
      } else if (!ALLOWED_EXTENSIONS.has(ext)) {
        if (ext === '.md' && (f.rel === 'README.md' || f.rel.endsWith('/README.md'))) {
          continue;
        }
        errors.push({
          code: ValidationCode.DISALLOWED_EXTENSION,
          message: `File type "${ext || '(none)'}" is not allowed in a theme package.`,
          file: f.rel,
        });
      }
    }

    // ---- 8. total unpacked size ---------------------------------------------
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > this.maxUnpackedBytes) {
      errors.push({
        code: ValidationCode.PACKAGE_TOO_LARGE,
        message: `Unpacked size ${(totalBytes / 1048576).toFixed(1)} MB exceeds the ${(this.maxUnpackedBytes / 1048576).toFixed(0)} MB limit.`,
      });
    }

    // ---- 7. every .tsx has a valid default-export component -------------------
    for (const f of files) {
      if (path.extname(f.rel).toLowerCase() !== '.tsx') continue;
      let source: string;
      try {
        source = await fs.readFile(f.abs, 'utf8');
      } catch {
        errors.push({ code: ValidationCode.UNREADABLE_FILE, message: 'Could not be read.', file: f.rel });
        continue;
      }
      const verdict = analyzeDefaultExport(source, f.rel);
      if (verdict.kind === 'error') {
        errors.push({ code: verdict.code, message: verdict.message, file: f.rel });
      } else if (verdict.kind === 'warning') {
        warnings.push({ code: verdict.code, message: verdict.message, file: f.rel });
      }
    }

    // ---- manifest-dependent checks (2, 3, 4) --------------------------------
    let resolvedManifest: ThemeManifest | undefined = manifest ?? undefined;
    if (manifest) {
      // Registration bootstrap validation (auto-discovery + entry file checks)
      const bootstrap = await themeBootstrap.validateOnly(root, manifest);
      resolvedManifest = bootstrap.manifest;
      for (const e of bootstrap.errors) errors.push({ ...e, code: e.code ?? ValidationCode.REGISTRATION_INVALID });
      for (const w of bootstrap.warnings) warnings.push({ ...w, code: w.code ?? ValidationCode.REGISTRATION_INVALID });
      const effectiveManifest = bootstrap.manifest;

      // 2. CMS compatibility
      if (!semver.satisfies(this.currentCmsVersion, effectiveManifest.compatibleCmsVersion, { includePrerelease: true })) {
        errors.push({
          code: ValidationCode.CMS_INCOMPATIBLE,
          message: `Theme requires CMS "${effectiveManifest.compatibleCmsVersion}" but this CMS is ${this.currentCmsVersion}.`,
          file: MANIFEST_FILENAME,
        });
      }

      // 3 + 4. every declared path exists on disk (index called out explicitly)
      const declared: { field: string; rel: string; required: boolean }[] = [];
      if (effectiveManifest.templates.index) {
        declared.push({ field: 'templates.index', rel: effectiveManifest.templates.index, required: true });
      }
      for (const [key, value] of Object.entries(effectiveManifest.templates)) {
        if (key === 'index' || typeof value !== 'string') continue;
        declared.push({ field: `templates.${key}`, rel: value, required: false });
      }
      for (const [key, value] of Object.entries(effectiveManifest.partials)) {
        if (typeof value === 'string') declared.push({ field: `partials.${key}`, rel: value, required: false });
      }
      (effectiveManifest.blocks ?? []).forEach((b, i) => {
        declared.push({ field: `blocks[${i}].rendererPath`, rel: b.rendererPath, required: false });
        if (b.schemaPath) declared.push({ field: `blocks[${i}].schemaPath`, rel: b.schemaPath, required: false });
      });

      // Editable-section cross-checks (parser already validates shape + block refs).
      const blockByType = new Map((effectiveManifest.blocks ?? []).map((b) => [b.type, b]));
      const seenSectionIds = new Set<string>();
      (effectiveManifest.editableSections ?? []).forEach((section, i) => {
        if (seenSectionIds.has(section.id)) {
          errors.push({
            code: ValidationCode.EDITABLE_SECTION_DUPLICATE_ID,
            message: `editableSections[${i}].id "${section.id}" is duplicated.`,
            file: MANIFEST_FILENAME,
          });
        }
        seenSectionIds.add(section.id);

        const block = blockByType.get(section.blockType);
        if (!block) {
          errors.push({
            code: ValidationCode.EDITABLE_SECTION_UNKNOWN_BLOCK,
            message: `editableSections[${i}] references unknown blockType "${section.blockType}".`,
            file: MANIFEST_FILENAME,
          });
        } else if (!block.schemaPath) {
          warnings.push({
            code: ValidationCode.EDITABLE_SECTION_MISSING_SCHEMA,
            message: `editableSections[${i}] ("${section.id}") has no schemaPath on block "${section.blockType}" — inspector fields will be limited.`,
            file: MANIFEST_FILENAME,
          });
        }
      });

      for (const d of declared) {
        const abs = path.resolve(root, d.rel);
        // Defence in depth: ManifestParser already rejected traversal lexically.
        if (!isInside(root, abs)) {
          errors.push({ code: ValidationCode.PATH_ESCAPE, message: `${d.field} resolves outside the package root.`, file: d.rel });
          continue;
        }
        let isFile = false;
        try {
          isFile = (await fs.stat(abs)).isFile();
        } catch {
          isFile = false;
        }
        if (!isFile) {
          errors.push({
            code: d.required ? ValidationCode.INDEX_TEMPLATE_MISSING : ValidationCode.DECLARED_FILE_MISSING,
            message: `${d.field} declares "${d.rel}" but no such file exists in the package.`,
            file: d.rel,
          });
        }
      }
    }

    return { valid: errors.length === 0, manifest: resolvedManifest, errors, warnings };
  }

  /** Read + parse theme.json, pushing every manifest issue as a validation error. */
  private async readManifest(
    root: string,
    errors: ThemeValidationIssue[],
    warnings: ThemeValidationIssue[]
  ): Promise<ThemeManifest | null> {
    const abs = path.join(root, MANIFEST_FILENAME);
    let raw: string;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch {
      errors.push({ code: ValidationCode.MANIFEST_MISSING, message: `"${MANIFEST_FILENAME}" is missing from the package root.`, file: MANIFEST_FILENAME });
      return null;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      errors.push({
        code: ValidationCode.MANIFEST_NOT_JSON,
        message: `"${MANIFEST_FILENAME}" is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        file: MANIFEST_FILENAME,
      });
      return null;
    }

    try {
      const { manifest, warnings: parseWarnings } = this.parser.parse(json);
      for (const w of parseWarnings) {
        warnings.push({ code: ValidationCode.MANIFEST_UNKNOWN_KEY, message: w, file: MANIFEST_FILENAME });
      }
      return manifest;
    } catch (err) {
      if (err instanceof ManifestValidationError) {
        // Surface EVERY failing field, not just the first.
        for (const issue of err.issues) {
          errors.push({
            code: ValidationCode.MANIFEST_INVALID,
            message: `${issue.path || '(root)'}: ${issue.message}`,
            file: MANIFEST_FILENAME,
          });
        }
        return null;
      }
      throw err;
    }
  }

  /** Recursively list files. Does not follow symlinked directories (loop-safe). */
  private async walk(dir: string, root: string, errors: ThemeValidationIssue[]): Promise<WalkedFile[]> {
    const out: WalkedFile[] = [];
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      errors.push({
        code: ValidationCode.UNREADABLE_FILE,
        message: 'Directory could not be read.',
        file: path.relative(root, dir).split(path.sep).join('/') || '.',
      });
      return out;
    }

    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');

      if (entry.isSymbolicLink()) {
        // Record it as a file entry so the traversal check can adjudicate it;
        // never descend into it.
        let size = 0;
        try {
          size = (await fs.stat(abs)).size;
        } catch {
          size = 0;
        }
        out.push({ abs, rel, size, isSymlink: true });
        continue;
      }

      if (entry.isDirectory()) {
        out.push(...(await this.walk(abs, root, errors)));
      } else if (entry.isFile()) {
        let size = 0;
        try {
          size = (await fs.stat(abs)).size;
        } catch {
          size = 0;
        }
        out.push({ abs, rel, size, isSymlink: false });
      }
    }
    return out;
  }
}

/* ------------------------------------------------------------------ *
 * §4.2 check 7 — default-export component analysis (AST only)
 * ------------------------------------------------------------------ */

type Verdict =
  | { kind: 'ok' }
  | { kind: 'warning'; code: string; message: string }
  | { kind: 'error'; code: string; message: string };

function hasDefaultModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const mods = ts.getModifiers(node);
  return !!mods?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

/** Unwrap parentheses / `as X` / `satisfies X` around an expression. */
function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  for (;;) {
    if (ts.isParenthesizedExpression(e)) e = e.expression;
    else if (ts.isAsExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
    else if (ts.isNonNullExpression(e)) e = e.expression;
    else return e;
  }
}

/** Classify an expression used as `export default <expr>`. */
function classifyExpression(expr: ts.Expression, sf: ts.SourceFile): Verdict {
  const e = unwrap(expr);

  if (ts.isArrowFunction(e) || ts.isFunctionExpression(e) || ts.isClassExpression(e)) return { kind: 'ok' };

  // React.memo(X) / forwardRef(X) / styled(X) — a component at runtime, but not
  // statically provable. Accept, and say so.
  if (ts.isCallExpression(e)) {
    return {
      kind: 'warning',
      code: ValidationCode.COMPONENT_UNVERIFIABLE,
      message: 'Default export is a call expression (e.g. memo()/forwardRef()); accepted but not statically verifiable as a component.',
    };
  }

  if (ts.isIdentifier(e)) return classifyIdentifier(e.text, sf);

  // Definitively not a component.
  if (
    ts.isObjectLiteralExpression(e) ||
    ts.isArrayLiteralExpression(e) ||
    ts.isStringLiteral(e) ||
    ts.isNoSubstitutionTemplateLiteral(e) ||
    ts.isTemplateExpression(e) ||
    ts.isNumericLiteral(e) ||
    e.kind === ts.SyntaxKind.TrueKeyword ||
    e.kind === ts.SyntaxKind.FalseKeyword ||
    e.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(e) && (e as ts.Identifier).text === 'undefined')
  ) {
    return {
      kind: 'error',
      code: ValidationCode.COMPONENT_DEFAULT_NOT_COMPONENT,
      message: 'Default export must be a function or class component (got a literal/object).',
    };
  }

  return {
    kind: 'error',
    code: ValidationCode.COMPONENT_DEFAULT_NOT_COMPONENT,
    message: 'Default export is not a function or class component.',
  };
}

/** Resolve a locally-declared identifier used as the default export. */
function classifyIdentifier(name: string, sf: ts.SourceFile): Verdict {
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === name) return { kind: 'ok' };
    if (ts.isClassDeclaration(stmt) && stmt.name?.text === name) return { kind: 'ok' };

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) {
          if (!decl.initializer) {
            return {
              kind: 'error',
              code: ValidationCode.COMPONENT_DEFAULT_NOT_COMPONENT,
              message: `Default export "${name}" has no initializer and cannot be a component.`,
            };
          }
          return classifyExpression(decl.initializer, sf);
        }
      }
    }

    // `import X from './x'; export default X;` — re-export of another module.
    if (ts.isImportDeclaration(stmt) && stmt.importClause) {
      const { name: defaultName, namedBindings } = stmt.importClause;
      if (defaultName?.text === name) return importedVerdict(name);
      if (namedBindings) {
        if (ts.isNamespaceImport(namedBindings) && namedBindings.name.text === name) return importedVerdict(name);
        if (ts.isNamedImports(namedBindings) && namedBindings.elements.some((el) => el.name.text === name)) {
          return importedVerdict(name);
        }
      }
    }
  }

  return {
    kind: 'error',
    code: ValidationCode.COMPONENT_DEFAULT_NOT_COMPONENT,
    message: `Default export "${name}" is not declared in this file.`,
  };
}

function importedVerdict(name: string): Verdict {
  return {
    kind: 'warning',
    code: ValidationCode.COMPONENT_UNVERIFIABLE,
    message: `Default export "${name}" is re-exported from another module; accepted but not statically verifiable as a component.`,
  };
}

/**
 * Parse a .tsx file and confirm it has a default export that is a function or
 * class component. Syntactic parse only — the file is NEVER executed.
 */
export function analyzeDefaultExport(source: string, fileName: string): Verdict {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);

  // `parseDiagnostics` is internal but is the only way to surface syntax errors
  // from a standalone SourceFile without building a full Program.
  const parseDiagnostics = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics;
  if (parseDiagnostics && parseDiagnostics.length > 0) {
    const first = parseDiagnostics[0];
    return {
      kind: 'error',
      code: ValidationCode.COMPONENT_SYNTAX_ERROR,
      message: `Syntax error: ${ts.flattenDiagnosticMessageText(first.messageText, ' ')}`,
    };
  }

  for (const stmt of sf.statements) {
    // export default function Foo() {} / export default class Foo {}
    if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && hasDefaultModifier(stmt)) {
      return { kind: 'ok' };
    }

    // export default <expr>;
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      return classifyExpression(stmt.expression, sf);
    }

    // export { Foo as default };
    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) {
        if (el.name.text === 'default') {
          // `export { default } from './x'` — re-export from another module.
          if (stmt.moduleSpecifier) return importedVerdict('default');
          return classifyIdentifier((el.propertyName ?? el.name).text, sf);
        }
      }
    }
  }

  return {
    kind: 'error',
    code: ValidationCode.COMPONENT_NO_DEFAULT_EXPORT,
    message: 'No default export found (named exports alone are not accepted).',
  };
}

/** Convenience singleton. */
export const themeValidator = new ThemeValidator();
