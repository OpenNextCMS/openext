/**
 * Module 8 (AssetManager) verification.
 *
 * Part 1 is pure/in-memory (no I/O). Part 2 proves the real end-to-end wiring
 * (ThemeInstaller computes the hash once at install -> ThemeLoader seeds
 * AssetManager on load -> getters return it with zero further I/O) against a
 * real Mongo connection + real filesystem.
 *
 * Run: npx tsx scripts/test-asset-manager.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { getPageDbConnection, closeAllConnections } from '../src/utils/db';
import { AssetManager } from '../src/modules/themeEngine/AssetManager';
import { ThemeInstaller } from '../src/modules/themeEngine/ThemeInstaller';
import { ThemeLoader } from '../src/modules/themeEngine/ThemeLoader';
import { getEngineThemeModel } from '../src/modules/themeEngine/models/Theme';
import { THEMES_ROOT, COMPILED_ROOT } from '../src/modules/themeEngine/config';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  // ---- Part 1: pure lookup semantics, no I/O ---------------------------------
  console.log('1. pure sync lookups (no registration yet -> throws, not silent)');
  const am = new AssetManager();
  check('isRegistered() is false before any registration', !am.isRegistered('acme', '1.0.0'));
  try {
    am.getStylesheetUrl('acme', '1.0.0');
    check('getStylesheetUrl() throws before registration', false, 'did not throw');
  } catch (err) {
    check('getStylesheetUrl() throws before registration', err instanceof Error, String(err));
  }

  console.log('2. registerAssetHashes() then pure sync getters');
  am.registerAssetHashes('acme', '1.0.0', { stylesheet: 'abc123', script: 'def456' });
  check('isRegistered() true after registration', am.isRegistered('acme', '1.0.0'));
  check(
    'getStylesheetUrl() includes the hash as a cache-busting query param',
    am.getStylesheetUrl('acme', '1.0.0') === '/theme-engine-assets/acme/assets/style.css?v=abc123',
    am.getStylesheetUrl('acme', '1.0.0')
  );
  check(
    'getScriptUrl() includes the hash',
    am.getScriptUrl('acme', '1.0.0') === '/theme-engine-assets/acme/assets/theme.js?v=def456',
    am.getScriptUrl('acme', '1.0.0')
  );
  check(
    'getPublicAssetUrl() builds a path under the theme, no hash tracked for arbitrary assets',
    am.getPublicAssetUrl('acme', 'public/fonts/Inter.woff2') === '/theme-engine-assets/acme/public/fonts/Inter.woff2',
    am.getPublicAssetUrl('acme', 'public/fonts/Inter.woff2')
  );

  console.log('3. a theme with no stylesheet/script -> URL without a hash query, not an error');
  am.registerAssetHashes('bare-theme', '1.0.0', {});
  check(
    'getStylesheetUrl() with no known hash omits the query string',
    am.getStylesheetUrl('bare-theme', '1.0.0') === '/theme-engine-assets/bare-theme/assets/style.css',
    am.getStylesheetUrl('bare-theme', '1.0.0')
  );

  console.log('4. two versions of the same slug never collide');
  am.registerAssetHashes('acme', '2.0.0', { stylesheet: 'newhash' });
  check('v1 keeps its own hash', am.getStylesheetUrl('acme', '1.0.0').includes('abc123'));
  check('v2 has an independent hash', am.getStylesheetUrl('acme', '2.0.0').includes('newhash'));

  // ---- Part 2: real end-to-end wiring (install -> load -> lookup) ------------
  console.log('5. end-to-end: ThemeInstaller hashes once, ThemeLoader seeds AssetManager, zero re-hash');
  const pageDb = await getPageDbConnection();
  const ThemeModel = getEngineThemeModel(pageDb);
  const installer = new ThemeInstaller();
  const installedBy = new mongoose.Types.ObjectId();
  const slug = 'asset-manager-fixture-theme';

  await ThemeModel.deleteOne({ slug });
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });
  await fs.rm(path.join(COMPILED_ROOT, slug), { recursive: true, force: true });

  const styleContent = '.fixture { color: red; }';
  const scriptContent = "console.log('fixture theme.js');";
  const expectedStyleHash = createHash('sha256').update(Buffer.from(styleContent)).digest('hex');
  const expectedScriptHash = createHash('sha256').update(Buffer.from(scriptContent)).digest('hex');

  const zip = new JSZip();
  zip.file(
    'theme.json',
    JSON.stringify({
      name: 'Asset Manager Fixture Theme',
      author: 'Test Suite',
      version: '1.0.0',
      compatibleCmsVersion: '^2.0.0',
      templates: { index: 'templates/Index.tsx' },
    })
  );
  zip.file('templates/Index.tsx', 'export default function Index() { return null; }\n');
  zip.file('assets/style.css', styleContent);
  zip.file('assets/theme.js', scriptContent);
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  const installedDoc = await installer.install(zipBuffer, { installedBy });
  check('ThemeDocument.assetHashes.stylesheet matches a real sha256 of the file content', installedDoc.assetHashes?.stylesheet === expectedStyleHash, installedDoc.assetHashes?.stylesheet);
  check('ThemeDocument.assetHashes.script matches a real sha256 of the file content', installedDoc.assetHashes?.script === expectedScriptHash, installedDoc.assetHashes?.script);

  // AssetManager has never heard of this theme yet — must throw.
  const freshAssetManager = new AssetManager();
  try {
    freshAssetManager.getStylesheetUrl(slug, '1.0.0');
    check('a fresh AssetManager throws before the theme is ever loaded', false, 'did not throw');
  } catch (err) {
    check('a fresh AssetManager throws before the theme is ever loaded', err instanceof Error);
  }

  const loaderWithFreshAssets = new ThemeLoader(undefined, undefined, freshAssetManager);
  let readFileCallsDuringLookup = 0;
  const originalReadFile = fs.readFile;
  await loaderWithFreshAssets.loadTheme(slug); // this is where AssetManager gets seeded

  // @ts-expect-error -- monkey-patching for a call-count spy, restored right after.
  fs.readFile = (...args: Parameters<typeof fs.readFile>) => {
    readFileCallsDuringLookup += 1;
    return originalReadFile(...args);
  };
  const stylesheetUrl = freshAssetManager.getStylesheetUrl(slug, '1.0.0');
  const scriptUrl = freshAssetManager.getScriptUrl(slug, '1.0.0');
  fs.readFile = originalReadFile;

  check('getStylesheetUrl() after loadTheme() returns the real installed hash', stylesheetUrl === `/theme-engine-assets/${slug}/assets/style.css?v=${expectedStyleHash}`, stylesheetUrl);
  check('getScriptUrl() after loadTheme() returns the real installed hash', scriptUrl === `/theme-engine-assets/${slug}/assets/theme.js?v=${expectedScriptHash}`, scriptUrl);
  check('zero fs.readFile calls happened during the URL getters themselves (pure sync lookup)', readFileCallsDuringLookup === 0, String(readFileCallsDuringLookup));

  // ---- cleanup ----------------------------------------------------------------
  await ThemeModel.deleteOne({ slug });
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });
  await fs.rm(path.join(COMPILED_ROOT, slug), { recursive: true, force: true });

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  await closeAllConnections();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await closeAllConnections().catch(() => undefined);
  process.exit(1);
});
