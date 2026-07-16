/**
 * Module 9 bridges verification — real Mongo. Bridges are the seam that DOES
 * touch the DB (they translate existing CMS reads into the engine's opaque
 * Cms* shapes); ThemeAPI itself must not, and that's verified separately in
 * scripts/test-theme-api.ts.
 *
 * menuBridge is tested read-only/structurally against whatever real header
 * page already exists in this dev tenant DB, rather than inserting a
 * synthetic global header (this DB already has real header content — adding
 * a competing `isGlobal:true` header risks confusing the live site).
 *
 * Run: npx tsx scripts/test-theme-bridges.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { getPageDbConnection, getPageModel, closeAllConnections } from '../src/utils/db';
import { resolveSiteSettings, resolveThemeSettingValues } from '../src/modules/themeEngine/bridges/settingsBridge';
import { resolveSiteMenu } from '../src/modules/themeEngine/bridges/menuBridge';
import { resolveImageUrl } from '../src/modules/themeEngine/bridges/imageBridge';
import { getEngineThemeSettingsModel, SINGLETON_ID } from '../src/modules/themeEngine/models/ThemeSettings';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function isCmsMenuItemArray(items: unknown): items is { id: string; label: string; url: string; children?: unknown[] }[] {
  if (!Array.isArray(items)) return false;
  return items.every(
    (i) =>
      i &&
      typeof i === 'object' &&
      typeof (i as Record<string, unknown>).id === 'string' &&
      typeof (i as Record<string, unknown>).label === 'string' &&
      typeof (i as Record<string, unknown>).url === 'string'
  );
}

async function main() {
  // ---- settingsBridge ---------------------------------------------------------
  console.log('1. settingsBridge.resolveSiteSettings() against the real Settings singleton');
  const site = await resolveSiteSettings();
  check('name is a non-empty string', typeof site.name === 'string' && site.name.length > 0, site.name);
  check('url is set from getSiteUrl()', typeof site.url === 'string' && site.url.length > 0, site.url);
  check('description is a string (may be empty)', typeof site.description === 'string');
  check('logo is either null or a /siteicon/... path', site.logo === null || (typeof site.logo === 'string' && site.logo.startsWith('/siteicon/')), String(site.logo));

  console.log('2. settingsBridge.resolveThemeSettingValues()');
  check('returns {} for a null activeSlug without touching Mongo', JSON.stringify(await resolveThemeSettingValues(null)) === '{}');

  const pageDb = await getPageDbConnection();
  const SettingsModel = getEngineThemeSettingsModel(pageDb);
  await SettingsModel.updateOne(
    { _id: SINGLETON_ID },
    { $set: { perThemeSettings: { 'bridges-fixture-theme': { accentColor: '#ff0000', showBanner: true } } } },
    { upsert: true }
  );
  const values = await resolveThemeSettingValues('bridges-fixture-theme');
  check('resolves the real perThemeSettings value for the active slug', values.accentColor === '#ff0000' && values.showBanner === true, JSON.stringify(values));
  check('returns {} for a slug with no saved settings', JSON.stringify(await resolveThemeSettingValues('some-other-slug')) === '{}');
  // cleanup this fixture's contribution without touching any real activeThemeSlug/previousThemeSlug state
  await SettingsModel.updateOne({ _id: SINGLETON_ID }, { $unset: { 'perThemeSettings.bridges-fixture-theme': '' } });

  // ---- menuBridge (read-only structural check against real data) --------------
  console.log('3. menuBridge.resolveSiteMenu() — structural check against whatever real header exists');
  const Page = getPageModel(pageDb);
  const headerCount = await Page.countDocuments({ pageType: 'header' });
  const menu = await resolveSiteMenu();
  check('never throws', true); // reaching this line already proves it
  check('returns an array', Array.isArray(menu));
  if (headerCount === 0) {
    check('no header in this DB -> empty menu (graceful, not an error)', menu.length === 0, JSON.stringify(menu));
  } else {
    check('well-formed CmsMenuItem[] shape (id/label/url are strings)', isCmsMenuItemArray(menu), JSON.stringify(menu).slice(0, 500));
  }

  // ---- imageBridge (pure) -------------------------------------------------------
  console.log('4. imageBridge.resolveImageUrl()');
  check('empty ref -> empty string', resolveImageUrl('') === '');
  check('absolute http(s) URL passes through unchanged', resolveImageUrl('https://cdn.example.com/a.png') === 'https://cdn.example.com/a.png');
  check('data: URI passes through unchanged', resolveImageUrl('data:image/png;base64,AAAA') === 'data:image/png;base64,AAAA');
  check('already site-relative path passes through unchanged', resolveImageUrl('/uploads/a.png') === '/uploads/a.png');
  check('bare relative filename is normalized to a site-relative path', resolveImageUrl('uploads/a.png') === '/uploads/a.png');
  check('width/height opts are accepted but do not throw (documented no-op)', resolveImageUrl('/uploads/a.png', { width: 200, height: 100 }) === '/uploads/a.png');

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  await closeAllConnections();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await closeAllConnections().catch(() => undefined);
  process.exit(1);
});
