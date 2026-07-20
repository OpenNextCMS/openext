import fs from 'fs/promises';
import path from 'path';
import { ThemeEngine } from './ThemeEngine';
import { ThemeRepository } from '../repositories/ThemeRepository';
import { invalidateTheme } from './CacheManager';
import { ThemeEngineError, ThemeNotFoundError, SecurityViolationError } from '../errors';

/**
 * ThemeEditorService — safe read/list/write of a theme's text files for the
 * Monaco-based Theme Editor (spec §13). All paths are traversal-guarded via
 * ThemeEngine.resolvePath and restricted to text/editable extensions; writes bust
 * the theme cache so edits show immediately (§12).
 */

const EDITABLE_EXTS = new Set([
  '.css', '.scss', '.less', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.json', '.html', '.htm', '.md', '.txt', '.svg', '.xml',
]);
const MAX_EDIT_BYTES = 2 * 1024 * 1024; // 2 MB per file
const SKIP_DIRS = new Set(['node_modules', '.git']);

function isEditable(rel: string): boolean {
  return EDITABLE_EXTS.has(path.extname(rel).toLowerCase());
}

async function walk(dir: string, base: string, out: string[]): Promise<void> {
  let items: import('fs').Dirent[];
  try {
    items = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const item of items) {
    if (item.isSymbolicLink()) continue;
    const abs = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (SKIP_DIRS.has(item.name)) continue;
      await walk(abs, base, out);
    } else if (item.isFile()) {
      const rel = path.relative(base, abs).split(path.sep).join('/');
      if (isEditable(rel)) out.push(rel);
    }
  }
}

export const ThemeEditorService = {
  /** List editable files in a theme, sorted for the editor's file tree. */
  async listFiles(slug: string): Promise<string[]> {
    const theme = await ThemeRepository.findBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    const dir = ThemeEngine.themeDir(slug);
    const files: string[] = [];
    await walk(dir, dir, files);
    return files.sort((a, b) => a.localeCompare(b));
  },

  /** Read a single editable file's text content. */
  async readFile(slug: string, relativePath: string): Promise<{ path: string; content: string }> {
    const theme = await ThemeRepository.findBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    if (!isEditable(relativePath)) throw new SecurityViolationError('this file type is not editable.', { relativePath });

    const abs = ThemeEngine.resolvePath(slug, relativePath);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat || !stat.isFile()) throw new ThemeEngineError(`File not found: "${relativePath}".`, { slug });
    if (stat.size > MAX_EDIT_BYTES) throw new SecurityViolationError('file is too large to edit.', { size: stat.size });

    return { path: relativePath, content: await fs.readFile(abs, 'utf8') };
  },

  /** Write text content to an editable file (must resolve inside the theme dir). */
  async writeFile(slug: string, relativePath: string, content: string): Promise<{ path: string }> {
    const theme = await ThemeRepository.findBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    if (!isEditable(relativePath)) throw new SecurityViolationError('this file type is not editable.', { relativePath });
    if (Buffer.byteLength(content, 'utf8') > MAX_EDIT_BYTES) {
      throw new SecurityViolationError('content exceeds the editable size limit.');
    }

    const abs = ThemeEngine.resolvePath(slug, relativePath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    invalidateTheme(slug); // edits visible on next render
    return { path: relativePath };
  },
};
