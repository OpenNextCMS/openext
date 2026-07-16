/**
 * Module 3 (ThemeInstaller) verification — real Mongo (per-tenant page DB) +
 * real filesystem writes under `themes/` and `storage/tmp/theme-uploads/`.
 *
 * Prerequisites: the same .env this app uses (MongoDB connection + PAGE_DB_NAME).
 * Run: npx tsx scripts/test-theme-installer.ts
 *
 * Cleans up everything it creates (DB doc + installed dir) on the way out.
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { getPageDbConnection, closeAllConnections } from '../src/utils/db';
import { ThemeInstaller } from '../src/modules/themeEngine/ThemeInstaller';
import { getEngineThemeModel } from '../src/modules/themeEngine/models/Theme';
import { ThemeInstallError, ThemeAlreadyExistsError } from '../src/modules/themeEngine/errors';
import { THEMES_ROOT, TEMP_UPLOAD_ROOT } from '../src/modules/themeEngine/config';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const VALID_TSX = `export default function Index() {\n  return null;\n}\n`;

function manifestJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify(
    {
      name: 'Installer Fixture Theme',
      author: 'Test Suite',
      version: '1.0.0',
      compatibleCmsVersion: '^2.0.0',
      templates: { index: 'templates/Index.tsx' },
      ...overrides,
    },
    null,
    2
  );
}

async function buildZip(files: Record<string, string | Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [rel, content] of Object.entries(files)) zip.file(rel, content);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function listTempExtractDirs(): Promise<string[]> {
  try {
    return await fs.readdir(TEMP_UPLOAD_ROOT);
  } catch {
    return [];
  }
}

async function main() {
  const pageDb = await getPageDbConnection();
  const ThemeModel = getEngineThemeModel(pageDb);
  const installer = new ThemeInstaller();
  const installedBy = new mongoose.Types.ObjectId();

  // ---- 1. valid fixture installs cleanly ---------------------------------
  console.log('1. valid fixture zip installs successfully');
  const slug = 'installer-fixture-theme';
  await ThemeModel.deleteOne({ slug }); // in case a previous failed run left one behind
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });

  const validZip = await buildZip({
    'theme.json': manifestJson(),
    'templates/Index.tsx': VALID_TSX,
  });

  try {
    const doc = await installer.install(validZip, { installedBy });
    check('status === "installed"', doc.status === 'installed', doc.status);
    check('checksum is a 64-char sha256 hex string', /^[a-f0-9]{64}$/.test(doc.checksum), doc.checksum);
    check('installLog has a "success" entry', doc.installLog.some((e) => e.step === 'success' && e.status === 'ok'), JSON.stringify(doc.installLog));
    check('installLog covers multiple stages', new Set(doc.installLog.map((e) => e.step)).size >= 3, JSON.stringify(doc.installLog.map((e) => e.step)));
    check('installPath recorded', doc.installPath === `themes/${slug}`, doc.installPath);

    const onDisk = await fs.readFile(path.join(THEMES_ROOT, slug, 'theme.json'), 'utf8').catch(() => null);
    check('theme.json present on disk at THEMES_ROOT/{slug}', onDisk !== null);
    const tplOnDisk = await fs.readFile(path.join(THEMES_ROOT, slug, 'templates', 'Index.tsx'), 'utf8').catch(() => null);
    check('templates/Index.tsx present on disk', tplOnDisk !== null);

    const persisted = await ThemeModel.findOne({ slug });
    check('a themes doc exists in Mongo', persisted !== null);
  } catch (err) {
    check('installs without throwing', false, String(err));
  }

  // ---- 2. re-install same slug without replace is rejected ---------------
  console.log('2. duplicate slug without replace=true is rejected');
  try {
    await installer.install(validZip, { installedBy });
    check('throws ThemeAlreadyExistsError', false, 'did not throw');
  } catch (err) {
    check('throws ThemeAlreadyExistsError', err instanceof ThemeAlreadyExistsError, String(err));
  }
  {
    const stillThere = await ThemeModel.findOne({ slug });
    check('original doc untouched by the rejected re-install', stillThere?.version === '1.0.0');
  }

  // ---- 3. replace=true upgrades in place (atomic swap) --------------------
  console.log('3. replace=true upgrades the existing install');
  const upgradeZip = await buildZip({
    'theme.json': manifestJson({ version: '2.0.0' }),
    'templates/Index.tsx': VALID_TSX,
  });
  try {
    const doc = await installer.install(upgradeZip, { installedBy, replace: true });
    check('version bumped to 2.0.0', doc.version === '2.0.0', doc.version);
    const oldAsideLeftBehind = (await fs.readdir(THEMES_ROOT)).some((d) => d.startsWith(`${slug}.replaced-`));
    check('no leftover "*.replaced-*" aside directory after a successful upgrade', !oldAsideLeftBehind);
  } catch (err) {
    check('upgrade does not throw', false, String(err));
  }

  // ---- 4. corrupt zip: no DB row, no leftover temp dir ---------------------
  console.log('4. corrupt zip leaves no DB row and no leftover temp dir');
  {
    const before = await listTempExtractDirs();
    const countBefore = await ThemeModel.countDocuments({});
    try {
      await installer.install(Buffer.from('this is definitely not a zip file'), { installedBy });
      check('throws ThemeInstallError', false, 'did not throw');
    } catch (err) {
      check('throws ThemeInstallError', err instanceof ThemeInstallError, String(err));
    }
    const after = await listTempExtractDirs();
    const countAfter = await ThemeModel.countDocuments({});
    check('no new temp extract dir left behind', after.length <= before.length, `before=${before.length} after=${after.length}`);
    check('no new DB row created', countAfter === countBefore, `before=${countBefore} after=${countAfter}`);
  }

  // ---- 5. oversized package: rejected during extraction, nothing persisted -
  console.log('5. oversized package rejected during extraction (no DB row, no leftover temp dir)');
  {
    const before = await listTempExtractDirs();
    const countBefore = await ThemeModel.countDocuments({});
    const oversizedZip = await buildZip({
      'theme.json': manifestJson({ name: 'Oversized Fixture Theme' }),
      'templates/Index.tsx': VALID_TSX,
      // Exceeds the default 50 MB MAX_UNPACKED_BYTES cap.
      'assets/big.bin': Buffer.alloc(55 * 1024 * 1024, 1),
    });
    try {
      await installer.install(oversizedZip, { installedBy });
      check('throws ThemeInstallError', false, 'did not throw');
    } catch (err) {
      check('throws ThemeInstallError', err instanceof ThemeInstallError, String(err));
      check('error message mentions the size limit', /limit|large|bomb/i.test((err as Error).message), (err as Error).message);
    }
    const after = await listTempExtractDirs();
    const countAfter = await ThemeModel.countDocuments({});
    check('no new temp extract dir left behind', after.length <= before.length, `before=${before.length} after=${after.length}`);
    check('no new DB row created', countAfter === countBefore, `before=${countBefore} after=${countAfter}`);
  }

  // ---- 6. package that fails ThemeValidator records a "failed" row --------
  console.log('6. package that fails whole-package validation records a "failed" DB row (new slug only)');
  {
    const brokenSlug = 'installer-fixture-broken';
    await ThemeModel.deleteOne({ slug: brokenSlug });
    const brokenZip = await buildZip({
      'theme.json': manifestJson({ name: 'Installer Fixture Broken' }),
      'templates/Index.tsx': 'export function NotDefaultExported() { return null; }\n',
    });
    try {
      await installer.install(brokenZip, { installedBy });
      check('throws ThemeInstallError', false, 'did not throw');
    } catch (err) {
      check('throws ThemeInstallError', err instanceof ThemeInstallError, String(err));
    }
    const failedDoc = await ThemeModel.findOne({ slug: brokenSlug });
    check('a "failed" status row was recorded', failedDoc?.status === 'failed', JSON.stringify(failedDoc));
    const onDisk = await fs
      .stat(path.join(THEMES_ROOT, brokenSlug))
      .then(() => true)
      .catch(() => false);
    check('nothing installed on disk for the broken slug', !onDisk);
    await ThemeModel.deleteOne({ slug: brokenSlug });
  }

  // ---- cleanup --------------------------------------------------------------
  await ThemeModel.deleteOne({ slug });
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  await closeAllConnections();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await closeAllConnections().catch(() => undefined);
  process.exit(1);
});
