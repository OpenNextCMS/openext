import fs from 'fs/promises';
import path from 'path';
import type { ThemeValidationIssue } from '../types';
import type { ThemeRuntimeRegistry } from './types';
import { registryToManifestPaths } from './manifestFromRegistry';

export const RegistrationValidationCode = {
  DUPLICATE_TEMPLATE: 'REG_DUPLICATE_TEMPLATE',
  DUPLICATE_BLOCK: 'REG_DUPLICATE_BLOCK',
  DUPLICATE_COMMAND: 'REG_DUPLICATE_COMMAND',
  DUPLICATE_PARTIAL: 'REG_DUPLICATE_PARTIAL',
  MISSING_RENDERER: 'REG_MISSING_RENDERER',
  MISSING_SCHEMA: 'REG_MISSING_SCHEMA',
  INVALID_PATH: 'REG_INVALID_PATH',
  INDEX_TEMPLATE_MISSING: 'REG_INDEX_TEMPLATE_MISSING',
  INVALID_HOOK_NAME: 'REG_INVALID_HOOK_NAME',
  CIRCULAR_REGISTRATION: 'REG_CIRCULAR_REGISTRATION',
  ENTRY_FILE_MISSING: 'REG_ENTRY_FILE_MISSING',
  THEME_TS_LOAD_FAILED: 'REG_THEME_TS_LOAD_FAILED',
} as const;

const VALID_HOOK_NAMES = new Set([
  'install',
  'activate',
  'deactivate',
  'upgrade',
  'render',
  'destroy',
  'beforeRender',
  'afterRender',
  'beforeSave',
  'afterSave',
  'beforePublish',
  'afterPublish',
]);

export interface RegistrationValidationResult {
  valid: boolean;
  errors: ThemeValidationIssue[];
  warnings: ThemeValidationIssue[];
}

export async function validateRegistration(
  root: string,
  registry: ThemeRuntimeRegistry,
  options: { requireIndexTemplate?: boolean; entryPath?: string } = {}
): Promise<RegistrationValidationResult> {
  const errors: ThemeValidationIssue[] = [];
  const warnings: ThemeValidationIssue[] = [];
  const { requireIndexTemplate = true, entryPath } = options;

  if (entryPath) {
    const abs = path.join(root, entryPath);
    if (!(await isFile(abs))) {
      errors.push({
        code: RegistrationValidationCode.ENTRY_FILE_MISSING,
        message: `theme.json declares entry "${entryPath}" but the file does not exist.`,
        file: entryPath,
      });
    }
  }

  const paths = registryToManifestPaths(registry);

  if (requireIndexTemplate && !paths.templates.index) {
    errors.push({
      code: RegistrationValidationCode.INDEX_TEMPLATE_MISSING,
      message: 'No index template registered. Declare templates/index.tsx or registerTemplate("index", ...).',
    });
  }

  for (const [key, tpl] of Object.entries(registry.templates)) {
    if (!(await isFile(path.join(root, tpl.path)))) {
      errors.push({
        code: RegistrationValidationCode.INVALID_PATH,
        message: `Template "${key}" path "${tpl.path}" does not exist.`,
        file: tpl.path,
      });
    }
  }

  for (const [key, partial] of Object.entries(registry.partials)) {
    if (!(await isFile(path.join(root, partial.path)))) {
      errors.push({
        code: RegistrationValidationCode.INVALID_PATH,
        message: `Partial "${key}" path "${partial.path}" does not exist.`,
        file: partial.path,
      });
    }
  }

  const blockTypes = new Set<string>();
  for (const block of Object.values(registry.blocks)) {
    if (blockTypes.has(block.type)) {
      errors.push({
        code: RegistrationValidationCode.DUPLICATE_BLOCK,
        message: `Duplicate block type "${block.type}".`,
      });
    }
    blockTypes.add(block.type);

    const rendererPath = block.rendererPath;
    if (rendererPath) {
      if (!(await isFile(path.join(root, rendererPath)))) {
        errors.push({
          code: RegistrationValidationCode.MISSING_RENDERER,
          message: `Block "${block.type}" renderer "${rendererPath}" does not exist.`,
          file: rendererPath,
        });
      }
    } else if (!block.renderer) {
      errors.push({
        code: RegistrationValidationCode.MISSING_RENDERER,
        message: `Block "${block.type}" has no renderer path or component.`,
      });
    }

    if (block.schemaPath && !(await isFile(path.join(root, block.schemaPath)))) {
      warnings.push({
        code: RegistrationValidationCode.MISSING_SCHEMA,
        message: `Block "${block.type}" schema "${block.schemaPath}" does not exist.`,
        file: block.schemaPath,
      });
    }
  }

  const commandIds = new Set<string>();
  for (const cmd of Object.values(registry.commands)) {
    if (commandIds.has(cmd.id)) {
      errors.push({
        code: RegistrationValidationCode.DUPLICATE_COMMAND,
        message: `Duplicate command id "${cmd.id}".`,
      });
    }
    commandIds.add(cmd.id);
  }

  for (const hook of registry.hooks) {
    if (!VALID_HOOK_NAMES.has(hook.name)) {
      errors.push({
        code: RegistrationValidationCode.INVALID_HOOK_NAME,
        message: `Invalid hook name "${hook.name}".`,
      });
    }
  }

  for (const asset of registry.assets) {
    if (!(await isFile(path.join(root, asset.path)))) {
      warnings.push({
        code: RegistrationValidationCode.INVALID_PATH,
        message: `Asset "${asset.path}" (${asset.kind}) does not exist.`,
        file: asset.path,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

async function isFile(abs: string): Promise<boolean> {
  try {
    return (await fs.stat(abs)).isFile();
  } catch {
    return false;
  }
}
