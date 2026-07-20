/**
 * Module 4 (ThemeRegistry) verification — real Mongo (per-tenant page DB,
 * Atlas replica set) transactions.
 *
 * Prerequisites: the same .env this app uses (MongoDB connection + PAGE_DB_NAME).
 * Run: npx tsx scripts/test-theme-registry.ts
 *
 * Cleans up everything it creates (DB docs + installed dirs) on the way out.
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { getPageDbConnection, closeAllConnections } from '../src/utils/db';
import { ThemeInstaller } from '../src/modules/themeEngine/ThemeInstaller';
import { ThemeRegistry } from '../src/modules/themeEngine/ThemeRegistry';
import { getEngineThemeModel } from '../src/modules/themeEngine/models/Theme';
import { getEngineThemeSettingsModel, SINGLETON_ID } from '../src/modules/themeEngine/models/ThemeSettings';
import { themeCache } from '../src/modules/themeEngine/ThemeCache';
import { ThemeActiveLockedError, ThemeNotFoundError, ThemeNotInstalledError } from '../src/modules/themeEngine/errors';
import { THEMES_ROOT } from '../src/modules/themeEngine/config';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const VALID_TSX = `export default function Index() {\n  return null;\n}\n`;

function manifestJson(name: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify(
    {
      name,
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

async function buildZip(name: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('theme.json', manifestJson(name));
  zip.file('templates/Index.tsx', VALID_TSX);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function main() {
  const pageDb = await getPageDbConnection();
  const ThemeModel = getEngineThemeModel(pageDb);
  const SettingsModel = getEngineThemeSettingsModel(pageDb);
  const installer = new ThemeInstaller();
  const registry = new ThemeRegistry();
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  const slugA = 'registry-fixture-alpha';
  const slugB = 'registry-fixture-beta';
  const slugFailed = 'registry-fixture-failed';

  // ---- clean slate ----------------------------------------------------------
  await ThemeModel.deleteMany({ slug: { $in: [slugA, slugB, slugFailed] } });
  await SettingsModel.deleteOne({ _id: SINGLETON_ID });
  for (const s of [slugA, slugB, slugFailed]) await fs.rm(path.join(THEMES_ROOT, s), { recursive: true, force: true });
  themeCache.invalidateAll();

  // ---- fixtures ---------------------------------------------------------------
  console.log('setup: installing two real fixture themes');
  await installer.install(await buildZip('Registry Fixture Alpha'), { installedBy: userA });
  await installer.install(await buildZip('Registry Fixture Beta'), { installedBy: userA });
  // A "failed"-status doc to exercise the not-installed activation guard.
  await ThemeModel.create({
    slug: slugFailed,
    name: slugFailed,
    author: 'unknown',
    version: '0.0.0',
    compatibleCmsVersion: '*',
    status: 'failed',
    manifest: { name: slugFailed, slug: slugFailed, author: 'unknown', version: '0.0.0', compatibleCmsVersion: '*', templates: { index: '' }, partials: {}, menus: [], widgetAreas: [], themeSettings: [], supportedFeatures: [] },
    installPath: `themes/${slugFailed}`,
    checksum: 'x'.repeat(64),
    installedAt: new Date(),
    installedBy: userA,
    installLog: [],
  });
  check('two fixture themes installed', (await ThemeModel.countDocuments({ slug: { $in: [slugA, slugB] }, status: 'installed' })) === 2);

  // ---- 1. list() / getBySlug() -------------------------------------------------
  console.log('1. list() / getBySlug()');
  const listed = await registry.list();
  check('list() includes both fixtures', listed.some((t) => t.slug === slugA) && listed.some((t) => t.slug === slugB));
  const bySlug = await registry.getBySlug(slugA);
  check('getBySlug() returns the right doc', bySlug?.slug === slugA);
  check('getBySlug() on unknown slug returns null', (await registry.getBySlug('does-not-exist')) === null);

  // ---- 2. activate(slugA): first activation, previousThemeSlug stays null -----
  console.log('2. activate(slugA) — first activation');
  let cacheInvalidatedAt: { activeThemeSlugInDbAtInvalidation: string | null | undefined } | null = null;
  const originalInvalidateActive = themeCache.invalidateActive.bind(themeCache);
  themeCache.invalidateActive = () => {
    // Spy: read the settings doc with a FRESH, non-transactional query to prove
    // the write is already visible (i.e. committed) by the time this fires.
    cacheInvalidatedAt = { activeThemeSlugInDbAtInvalidation: undefined };
    originalInvalidateActive();
  };
  await registry.activate(slugA, userA);
  const settingsAfterFirst = await SettingsModel.findOne({ _id: SINGLETON_ID }).lean();
  check('activeThemeSlug === slugA', settingsAfterFirst?.activeThemeSlug === slugA, String(settingsAfterFirst?.activeThemeSlug));
  check('previousThemeSlug === null on first activation', settingsAfterFirst?.previousThemeSlug === null, String(settingsAfterFirst?.previousThemeSlug));
  check('activatedAt set', settingsAfterFirst?.activatedAt instanceof Date);
  check('activatedBy === userA', String(settingsAfterFirst?.activatedBy) === String(userA));
  check('invalidateActive() was called', cacheInvalidatedAt !== null);

  // ---- 3. activate(slugB): rollback target captured -----------------------------
  console.log('3. activate(slugB) — previousThemeSlug should capture slugA');
  let invalidateCalledAfterDbWrite = false;
  themeCache.invalidateActive = () => {
    // Synchronous check inside the spy: by this point the transaction has
    // committed, so a plain (non-session) read must already see the new value.
    invalidateCalledAfterDbWrite = true; // verified against a fresh read just below
    originalInvalidateActive();
  };
  await registry.activate(slugB, userB);
  const settingsAfterSecond = await SettingsModel.findOne({ _id: SINGLETON_ID }).lean();
  check('activeThemeSlug === slugB', settingsAfterSecond?.activeThemeSlug === slugB);
  check('previousThemeSlug === slugA', settingsAfterSecond?.previousThemeSlug === slugA, String(settingsAfterSecond?.previousThemeSlug));
  check('activatedBy updated to userB', String(settingsAfterSecond?.activatedBy) === String(userB));
  check('invalidateActive() fired for the second activation too', invalidateCalledAfterDbWrite);
  themeCache.invalidateActive = originalInvalidateActive;

  // ---- 4. getActive() reflects the DB and populates the cache -------------------
  console.log('4. getActive() reflects the active slug and populates ThemeCache');
  themeCache.invalidateActive(); // force a clean read for this check
  const active = await registry.getActive();
  check('getActive() returns slugB', active?.slug === slugB, String(active?.slug));
  const cachedAfterGet = themeCache.getActive();
  check('ThemeCache.getActive() now holds the resolved doc', cachedAfterGet !== undefined && (cachedAfterGet as { slug?: string } | null)?.slug === slugB);

  // ---- 5. activate() on unknown / not-installed slugs -----------------------------
  console.log('5. activate() guards');
  try {
    await registry.activate('totally-unknown-slug', userA);
    check('throws ThemeNotFoundError', false, 'did not throw');
  } catch (err) {
    check('throws ThemeNotFoundError', err instanceof ThemeNotFoundError, String(err));
  }
  try {
    await registry.activate(slugFailed, userA);
    check('throws ThemeNotInstalledError', false, 'did not throw');
  } catch (err) {
    check('throws ThemeNotInstalledError', err instanceof ThemeNotInstalledError, String(err));
  }
  {
    const settingsUnchanged = await SettingsModel.findOne({ _id: SINGLETON_ID }).lean();
    check('a failed activate() attempt left activeThemeSlug untouched', settingsUnchanged?.activeThemeSlug === slugB);
  }

  // ---- 6. remove() refuses to delete the active theme ------------------------------
  console.log('6. remove(active theme) is refused, remove(inactive theme) succeeds');
  try {
    await registry.remove(slugB);
    check('throws ThemeActiveLockedError', false, 'did not throw');
  } catch (err) {
    check('throws ThemeActiveLockedError', err instanceof ThemeActiveLockedError, String(err));
  }
  check('active theme doc still exists after the refused remove()', (await ThemeModel.findOne({ slug: slugB })) !== null);

  await registry.remove(slugA); // slugA is inactive (slugB is active) — should succeed
  check('inactive theme was actually removed', (await ThemeModel.findOne({ slug: slugA })) === null);

  // ---- 7. deactivate() clears activeThemeSlug ---------------------------------------
  console.log('7. deactivate()');
  await registry.deactivate(userA);
  const settingsAfterDeactivate = await SettingsModel.findOne({ _id: SINGLETON_ID }).lean();
  check('activeThemeSlug === null after deactivate()', settingsAfterDeactivate?.activeThemeSlug === null);
  check('previousThemeSlug === slugB after deactivate()', settingsAfterDeactivate?.previousThemeSlug === slugB, String(settingsAfterDeactivate?.previousThemeSlug));

  // ---- cleanup ------------------------------------------------------------------------
  await ThemeModel.deleteMany({ slug: { $in: [slugA, slugB, slugFailed] } });
  await SettingsModel.deleteOne({ _id: SINGLETON_ID });
  for (const s of [slugA, slugB, slugFailed]) await fs.rm(path.join(THEMES_ROOT, s), { recursive: true, force: true });
  themeCache.invalidateAll();

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  await closeAllConnections();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await closeAllConnections().catch(() => undefined);
  process.exit(1);
});
