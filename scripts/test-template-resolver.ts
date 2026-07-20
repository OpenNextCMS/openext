/**
 * Module 7 (TemplateHierarchy + TemplateResolver) verification — pure, no I/O.
 * Run: npx tsx scripts/test-template-resolver.ts
 */
import { TemplateHierarchy } from '../src/modules/themeEngine/TemplateHierarchy';
import { TemplateResolver } from '../src/modules/themeEngine/TemplateResolver';
import { TemplateResolutionError } from '../src/modules/themeEngine/errors';
import type { LoadedTheme, PageRenderContext, ThemeComponent, ThemeManifest } from '../src/modules/themeEngine/types';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const hierarchy = new TemplateHierarchy();
const resolver = new TemplateResolver(hierarchy);

const FakeComponent = (() => null) as unknown as ThemeComponent;

function fakeManifest(slug: string): ThemeManifest {
  return {
    name: slug,
    slug,
    author: 'Test',
    version: '1.0.0',
    compatibleCmsVersion: '^2.0.0',
    templates: { index: 'templates/Index.tsx' },
    partials: {},
    menus: [],
    widgetAreas: [],
    themeSettings: [],
    supportedFeatures: [],
  };
}

function fakeLoadedTheme(slug: string, templateKeys: string[]): LoadedTheme {
  const templates: Record<string, ThemeComponent> = {};
  for (const key of templateKeys) templates[key] = FakeComponent;
  return { manifest: fakeManifest(slug), templates, partials: {}, blocks: {} };
}

// ---- 1. every pageType produces an ordered list ending in "index" -----------
console.log('1. resolveOrder() always ends in "index" for every pageType');
const pageTypes: PageRenderContext['pageType'][] = ['home', 'page', 'post', 'archive', 'custom'];
for (const pageType of pageTypes) {
  const order = hierarchy.resolveOrder({ pageType });
  check(`${pageType}: ends in "index"`, order[order.length - 1] === 'index', JSON.stringify(order));
  check(`${pageType}: "index" appears exactly once`, order.filter((k) => k === 'index').length === 1, JSON.stringify(order));
}

// ---- 2. specific chains match the intended fallback shape ---------------------
console.log('2. specific fallback chains');
check('home -> [home, page, index]', JSON.stringify(hierarchy.resolveOrder({ pageType: 'home' })) === JSON.stringify(['home', 'page', 'index']));
check('page -> [page, index]', JSON.stringify(hierarchy.resolveOrder({ pageType: 'page' })) === JSON.stringify(['page', 'index']));
check('post -> [post, page, index]', JSON.stringify(hierarchy.resolveOrder({ pageType: 'post' })) === JSON.stringify(['post', 'page', 'index']));
check('archive -> [archive, index]', JSON.stringify(hierarchy.resolveOrder({ pageType: 'archive' })) === JSON.stringify(['archive', 'index']));
check('custom (no key) -> [page, index]', JSON.stringify(hierarchy.resolveOrder({ pageType: 'custom' })) === JSON.stringify(['page', 'index']));

// ---- 3. customTemplateKey takes precedence, and is deduped -------------------
console.log('3. customTemplateKey');
check(
  'custom with key -> [key, page, index]',
  JSON.stringify(hierarchy.resolveOrder({ pageType: 'custom', customTemplateKey: 'landing' })) === JSON.stringify(['landing', 'page', 'index'])
);
check(
  'customTemplateKey works even for a non-custom pageType (most specific wins)',
  JSON.stringify(hierarchy.resolveOrder({ pageType: 'page', customTemplateKey: 'special' })) === JSON.stringify(['special', 'page', 'index'])
);
check(
  'customTemplateKey equal to the base chain entry is de-duped, not repeated',
  JSON.stringify(hierarchy.resolveOrder({ pageType: 'page', customTemplateKey: 'page' })) === JSON.stringify(['page', 'index'])
);
check(
  'pathological case: customTemplateKey === "index" still ends up ONLY at the end',
  JSON.stringify(hierarchy.resolveOrder({ pageType: 'page', customTemplateKey: 'index' })) === JSON.stringify(['page', 'index'])
);

// ---- 4. TemplateResolver picks the first AVAILABLE match ------------------------
console.log('4. TemplateResolver.resolve() picks the first available match');
{
  const theme = fakeLoadedTheme('acme', ['index']); // only index declared
  const comp = resolver.resolve(theme, { pageType: 'home' });
  check('falls all the way through to index when nothing else is declared', comp === theme.templates.index);
}
{
  const theme = fakeLoadedTheme('acme', ['page', 'index']); // home not declared, page is
  const comp = resolver.resolve(theme, { pageType: 'home' });
  check('home falls back to page when home is not declared', comp === theme.templates.page);
}
{
  const theme = fakeLoadedTheme('acme', ['home', 'page', 'index']);
  const comp = resolver.resolve(theme, { pageType: 'home' });
  check('most specific match wins when everything is declared', comp === theme.templates.home);
}
{
  const theme = fakeLoadedTheme('acme', ['landing', 'page', 'index']);
  const comp = resolver.resolve(theme, { pageType: 'page', customTemplateKey: 'landing' });
  check('customTemplateKey resolves to the theme-defined named template', comp === theme.templates.landing);
}

// ---- 5. TemplateResolutionError only when truly nothing matches -----------------
console.log('5. TemplateResolutionError only when truly nothing matches');
{
  // A LoadedTheme with NO templates at all (should be impossible post-ThemeValidator,
  // but TemplateResolver must defend anyway).
  const theme: LoadedTheme = { manifest: fakeManifest('broken'), templates: {}, partials: {}, blocks: {} };
  try {
    resolver.resolve(theme, { pageType: 'home' });
    check('throws TemplateResolutionError', false, 'did not throw');
  } catch (err) {
    check('throws TemplateResolutionError', err instanceof TemplateResolutionError, String(err));
    if (err instanceof TemplateResolutionError) {
      check('error message includes the theme slug', err.message.includes('broken'), err.message);
      check('error message includes the tried order', err.message.includes('home') && err.message.includes('page') && err.message.includes('index'), err.message);
    }
  }
}
{
  // One irrelevant template declared (e.g. "archive") while resolving for "post" —
  // still nothing matches the post/page/index chain.
  const theme = fakeLoadedTheme('acme', ['archive']);
  try {
    resolver.resolve(theme, { pageType: 'post' });
    check('throws when only an unrelated template exists', false, 'did not throw');
  } catch (err) {
    check('throws when only an unrelated template exists', err instanceof TemplateResolutionError, String(err));
  }
}

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
process.exit(failures === 0 ? 0 : 1);
