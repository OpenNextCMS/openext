/**
 * Module 5 (ThemeCache) verification — pure, in-memory, no I/O.
 * Run: npx tsx scripts/test-theme-cache.ts
 */
import { ThemeCache, themeCache, type ThemeCacheInvalidation } from '../src/modules/themeEngine/ThemeCache';
import type { ThemeDocument, ThemeManifest } from '../src/modules/themeEngine/types';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const fakeManifest = (name: string): ThemeManifest => ({
  name,
  slug: name,
  author: 'Test',
  version: '1.0.0',
  compatibleCmsVersion: '^2.0.0',
  templates: { index: 'templates/Index.tsx' },
  partials: {},
  menus: [],
  widgetAreas: [],
  themeSettings: [],
  supportedFeatures: [],
});

const fakeTheme = (slug: string): ThemeDocument =>
  ({ slug, name: slug, manifest: fakeManifest(slug) }) as unknown as ThemeDocument;

async function main() {
  // ---- 1. componentKey() builder ------------------------------------------
  console.log('1. componentKey() builder');
  const key = ThemeCache.componentKey('acme', '1.2.0', 'templates/Home.tsx');
  check('key format matches spec §4.5', key === 'acme@1.2.0::templates/Home.tsx', key);

  // ---- 2. versioned round-trip: setComponentModule / getComponentModule -----
  console.log('2. versioned round-trip');
  const cache = new ThemeCache();
  const modV1 = { fn: () => 'v1' };
  const modV2 = { fn: () => 'v2' };
  const keyV1 = ThemeCache.componentKey('acme', '1.0.0', 'templates/Index.tsx');
  const keyV2 = ThemeCache.componentKey('acme', '2.0.0', 'templates/Index.tsx');
  cache.setComponentModule(keyV1, modV1);
  cache.setComponentModule(keyV2, modV2);
  check('v1 round-trips under its own key', cache.getComponentModule(keyV1) === modV1);
  check('v2 round-trips under its own key', cache.getComponentModule(keyV2) === modV2);
  check('v1 and v2 do not collide (an upgrade cannot serve a stale component)', cache.getComponentModule(keyV1) !== cache.getComponentModule(keyV2));
  check('unknown key returns undefined', cache.getComponentModule('nope@0.0.0::x.tsx') === undefined);

  // ---- 3. invalidateTheme(slug) drops ONLY that slug's entries --------------
  console.log('3. invalidateTheme(slug) is scoped to that slug');
  const cache2 = new ThemeCache();
  cache2.setManifest('acme', fakeManifest('acme'));
  cache2.setManifest('other', fakeManifest('other'));
  cache2.setComponentModule(ThemeCache.componentKey('acme', '1.0.0', 'templates/Index.tsx'), modV1);
  cache2.setComponentModule(ThemeCache.componentKey('acme', '1.0.0', 'blocks/Hero/Renderer.tsx'), modV1);
  cache2.setComponentModule(ThemeCache.componentKey('other', '1.0.0', 'templates/Index.tsx'), modV2);
  cache2.invalidateTheme('acme');
  check('acme manifest dropped', cache2.getManifest('acme') === undefined);
  check('acme templates/Index.tsx dropped', cache2.getComponentModule(ThemeCache.componentKey('acme', '1.0.0', 'templates/Index.tsx')) === undefined);
  check('acme blocks/Hero/Renderer.tsx dropped', cache2.getComponentModule(ThemeCache.componentKey('acme', '1.0.0', 'blocks/Hero/Renderer.tsx')) === undefined);
  check('other manifest untouched', cache2.getManifest('other') !== undefined);
  check('other component module untouched', cache2.getComponentModule(ThemeCache.componentKey('other', '1.0.0', 'templates/Index.tsx')) === modV2);

  // ---- 4. active-theme slot: null vs undefined are distinct -----------------
  console.log('4. active-theme slot (null = "no active theme" vs undefined = "not cached")');
  const cache3 = new ThemeCache();
  check('nothing cached yet -> undefined', cache3.getActive() === undefined);
  cache3.setActive(null);
  check('explicitly "no active theme" -> null (not undefined)', cache3.getActive() === null);
  const theme = fakeTheme('acme');
  cache3.setActive(theme);
  check('cached active theme round-trips', cache3.getActive() === theme);
  cache3.invalidateActive();
  check('invalidateActive() resets to undefined (must re-read from registry)', cache3.getActive() === undefined);

  // ---- 5. invalidateTheme on the active slug also clears the active pointer -
  console.log('5. invalidateTheme(activeSlug) also clears the active pointer');
  const cache4 = new ThemeCache();
  cache4.setActive(fakeTheme('acme'));
  cache4.invalidateTheme('acme');
  check('active pointer cleared because it WAS the invalidated theme', cache4.getActive() === undefined);

  const cache4b = new ThemeCache();
  cache4b.setActive(fakeTheme('acme'));
  cache4b.invalidateTheme('unrelated-slug');
  check('active pointer untouched when a DIFFERENT theme is invalidated', cache4b.getActive()?.slug === 'acme');

  // ---- 6. invalidateAll clears everything ------------------------------------
  console.log('6. invalidateAll()');
  const cache5 = new ThemeCache();
  cache5.setManifest('acme', fakeManifest('acme'));
  cache5.setComponentModule(ThemeCache.componentKey('acme', '1.0.0', 'templates/Index.tsx'), modV1);
  cache5.setActive(fakeTheme('acme'));
  cache5.invalidateAll();
  check('manifests cleared', cache5.stats().manifests === 0);
  check('component modules cleared', cache5.stats().componentModules === 0);
  check('active pointer cleared', cache5.getActive() === undefined);

  // ---- 7. generation counter bumps on every invalidation ---------------------
  console.log('7. generation counter');
  const cache6 = new ThemeCache();
  const g0 = cache6.generation;
  cache6.invalidateTheme('x');
  const g1 = cache6.generation;
  cache6.invalidateActive();
  const g2 = cache6.generation;
  cache6.invalidateAll();
  const g3 = cache6.generation;
  check('generation strictly increases across invalidations', g0 < g1 && g1 < g2 && g2 < g3, `${g0},${g1},${g2},${g3}`);

  // ---- 8. TTL expiry (Option A) -----------------------------------------------
  console.log('8. TTL expiry (Option A)');
  const ttlCache = new ThemeCache({ ttlMs: 50 });
  ttlCache.setManifest('acme', fakeManifest('acme'));
  check('fresh entry is present immediately', ttlCache.getManifest('acme') !== undefined);
  await sleep(90);
  check('entry expires after ttlMs elapses', ttlCache.getManifest('acme') === undefined);

  const noTtlCache = new ThemeCache(); // ttlMs defaults to 0 = never expires
  noTtlCache.setManifest('acme', fakeManifest('acme'));
  await sleep(90);
  check('ttlMs=0 (default) never expires', noTtlCache.getManifest('acme') !== undefined);

  // ---- 9. pub/sub seam: onInvalidate() emits locally, applyRemote() does not -
  console.log('9. pub/sub seam (Option B)');
  const cache7 = new ThemeCache();
  const seen: ThemeCacheInvalidation[] = [];
  const unsubscribe = cache7.onInvalidate((event) => seen.push(event));
  cache7.setManifest('acme', fakeManifest('acme'));
  cache7.invalidateTheme('acme');
  check('local invalidation emits to subscribers', seen.length === 1 && seen[0].type === 'theme' && (seen[0] as { slug: string }).slug === 'acme', JSON.stringify(seen));

  cache7.setManifest('other', fakeManifest('other'));
  cache7.applyRemote({ type: 'theme', slug: 'other' });
  check('applyRemote() actually invalidates local state', cache7.getManifest('other') === undefined);
  check('applyRemote() does NOT re-emit to local subscribers (no publish loop)', seen.length === 1);

  unsubscribe();
  cache7.invalidateAll();
  check('unsubscribe() stops further delivery', seen.length === 1);

  // ---- 10. a broken subscriber must never break invalidation ------------------
  console.log('10. a throwing subscriber does not break invalidation');
  const cache8 = new ThemeCache();
  cache8.onInvalidate(() => {
    throw new Error('boom');
  });
  cache8.setManifest('acme', fakeManifest('acme'));
  let threw = false;
  try {
    cache8.invalidateTheme('acme');
  } catch {
    threw = true;
  }
  check('invalidateTheme() does not throw even if a listener throws', !threw);
  check('the invalidation itself still applied', cache8.getManifest('acme') === undefined);

  // ---- 11. the process-wide singleton exists and is stable across imports ----
  console.log('11. process-wide singleton');
  check('themeCache singleton is exported', themeCache instanceof ThemeCache);

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
}

main();
