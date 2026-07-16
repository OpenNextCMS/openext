/**
 * Dev utility: validate, zip, install, and activate a theme package folder
 * from `theme-packages/<name>/` through the REAL Theme Engine pipeline
 * (ThemeValidator -> ThemeInstaller -> ThemeRegistry) — the same path a real
 * ZIP upload would go through once the admin upload UI exists.
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/install-theme-package.ts <folder-name> [--no-activate]
 *
 * Example:
 *   npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/install-theme-package.ts farnic-furniture
 *
 * Writes `theme-packages/<folder-name>.zip` as a ready-to-upload artifact,
 * regardless of activation.
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { closeAllConnections } from '../src/utils/db';
import { ThemeValidator } from '../src/modules/themeEngine/ThemeValidator';
import { themeManager } from '../src/modules/themeEngine/ThemeManager';

async function addDirToZip(zip: JSZip, dir: string, prefix: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await addDirToZip(zip, abs, rel);
    else zip.file(rel, await fs.readFile(abs));
  }
}

async function main() {
  const folderName = process.argv[2];
  const activate = !process.argv.includes('--no-activate');
  if (!folderName) {
    console.error('Usage: install-theme-package.ts <folder-name-under-theme-packages> [--no-activate]');
    process.exit(1);
  }

  const sourceDir = path.join(process.cwd(), 'theme-packages', folderName);
  const exists = await fs.stat(sourceDir).then((s) => s.isDirectory()).catch(() => false);
  if (!exists) {
    console.error(`No such directory: ${sourceDir}`);
    process.exit(1);
  }

  console.log(`Validating theme-packages/${folderName} ...`);
  const validation = await new ThemeValidator().validate(sourceDir);
  if (!validation.valid) {
    console.error('Validation FAILED:');
    for (const e of validation.errors) console.error(`  [${e.code}] ${e.file ? `${e.file}: ` : ''}${e.message}`);
    process.exit(1);
  }
  if (validation.warnings.length > 0) {
    console.log('Validation warnings:');
    for (const w of validation.warnings) console.log(`  [${w.code}] ${w.file ? `${w.file}: ` : ''}${w.message}`);
  }
  console.log(`Valid. Slug: ${validation.manifest?.slug}`);

  const zip = new JSZip();
  await addDirToZip(zip, sourceDir, '');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });

  const zipOutPath = path.join(process.cwd(), 'theme-packages', `${folderName}.zip`);
  await fs.writeFile(zipOutPath, buffer);
  console.log(`Wrote zip: ${zipOutPath} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);

  const userId = new mongoose.Types.ObjectId();
  const doc = await themeManager.uploadAndInstall(buffer, userId, { replace: true });
  console.log(`Installed: ${doc.slug}@${doc.version} (status: ${doc.status})`);

  if (activate) {
    await themeManager.activate(doc.slug, userId);
    console.log(`Activated: ${doc.slug}`);
    console.log('\nRestart the dev server (or wait for its cache to pick this up) and reload a page to see it.');
  } else {
    console.log('\n--no-activate passed: installed but not activated.');
  }

  await closeAllConnections();
}

main().catch(async (err) => {
  console.error(err);
  await closeAllConnections().catch(() => undefined);
  process.exit(1);
});
