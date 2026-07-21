/**
 * Module 9 (ThemeAPI) verification — pure, in-memory. Every method must be a
 * synchronous accessor over already-fetched data: this spies on Mongoose's
 * query layer (`Query.prototype.exec`) around every single method call and
 * asserts the call count never moves. That's the plan's literal done-when.
 *
 * Run: npx tsx scripts/test-theme-api.ts
 */
import mongoose from 'mongoose';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { store } from '../src/redux/store';
import { ThemeApiImpl } from '../src/modules/themeEngine/ThemeAPI';
import { AssetManager } from '../src/modules/themeEngine/AssetManager';
import type { LoadedTheme, RenderInput, ThemeComponent, ThemeManifest } from '../src/modules/themeEngine/types';

function ReduxProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line react/no-children-prop -- react-redux's Provider prop types require children in the props object here; the 3-arg createElement form fails to type-check against its overloads.
  return React.createElement(Provider, { store, children });
}

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---- Mongo-call spy ------------------------------------------------------------
let queryExecCalls = 0;
const originalExec = mongoose.Query.prototype.exec;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mongoose.Query.prototype as any).exec = function (...args: unknown[]) {
  queryExecCalls += 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (originalExec as any).apply(this, args);
};

function withZeroMongoCheck<T>(label: string, fn: () => T): T {
  const before = queryExecCalls;
  const result = fn();
  const after = queryExecCalls;
  check(`${label}: zero Mongo query calls`, after === before, `before=${before} after=${after}`);
  return result;
}

// ---- fixtures --------------------------------------------------------------------
const HeroRenderer: ThemeComponent = (({ block }: { block: { data: Record<string, unknown> } }) =>
  React.createElement('div', { className: 'hero' }, String(block.data.title ?? ''))) as ThemeComponent;

const HeaderComponent: ThemeComponent = (() => React.createElement('header', null, 'Fixture Header')) as ThemeComponent;
const FooterComponent: ThemeComponent = (() => React.createElement('footer', null, 'Fixture Footer')) as ThemeComponent;

const manifest: ThemeManifest = {
  name: 'API Fixture Theme',
  slug: 'api-fixture-theme',
  author: 'Test',
  version: '1.0.0',
  compatibleCmsVersion: '^2.0.0',
  templates: { index: 'templates/Index.tsx' },
  partials: { header: 'partials/Header.tsx', footer: 'partials/Footer.tsx' },
  menus: [{ key: 'primary', label: 'Primary' }],
  widgetAreas: [],
  themeSettings: [
    { key: 'accentColor', label: 'Accent Color', type: 'color', default: '#000000' },
    { key: 'showBanner', label: 'Show Banner', type: 'boolean', default: false },
  ],
  supportedFeatures: [],
};

const loadedTheme: LoadedTheme = {
  manifest,
  templates: {},
  partials: { Header: HeaderComponent, Footer: FooterComponent },
  blocks: { hero: { Renderer: HeroRenderer, schema: { title: 'string' } } },
};

const renderInput: RenderInput = {
  page: { id: 'p1', slug: 'home', title: 'Home', type: 'home' },
  blocks: [
    { id: 'b1', type: 'hero', data: { title: 'Welcome' } },
    { id: 'b2', type: 'unregistered-type', data: { uniqueId: 'b2', type: 'unregistered-type', content: '' } },
  ],
  menus: [
    { key: 'primary', items: [{ id: 'link-0', label: 'Home', url: '/' }, { id: 'link-1', label: 'About', url: '/about' }] },
    { key: 'footer', items: [{ id: 'flink-0', label: 'Contact', url: '/contact' }] },
  ],
  settings: { name: 'Fixture Site', url: 'https://fixture.example.com', description: 'A fixture site', logo: '/siteicon/logo.png' },
  currentUser: { id: 'u1', name: 'Test User', role: 'Admin' },
};

async function main() {
  const assets = new AssetManager();
  assets.registerAssetHashes(manifest.slug, manifest.version, { stylesheet: 'stylehash', script: 'scripthash' });

  const api = new ThemeApiImpl({
    input: renderInput,
    loadedTheme,
    themeSettingValues: { accentColor: '#ff0000' }, // overrides only ONE of the two declared settings
    assets,
  });

  console.log('1. site()');
  const site = withZeroMongoCheck('site()', () => api.site());
  check('site() maps RenderInput.settings correctly', site.name === 'Fixture Site' && site.url === 'https://fixture.example.com' && site.description === 'A fixture site', JSON.stringify(site));

  console.log('2. page()');
  const page = withZeroMongoCheck('page()', () => api.page());
  check('page() returns RenderInput.page unchanged', page.slug === 'home' && page.title === 'Home');

  console.log('3. menu() / navigation()');
  const primary = withZeroMongoCheck('menu("primary")', () => api.menu('primary'));
  check('menu("primary") returns the matching menu', primary.length === 2 && primary[0].label === 'Home');
  const footer = withZeroMongoCheck('navigation("footer")', () => api.navigation('footer'));
  check('navigation("footer") returns the matching menu', footer.length === 1 && footer[0].label === 'Contact');
  const fallback = withZeroMongoCheck('menu("does-not-exist")', () => api.menu('does-not-exist'));
  check('an unknown key falls back to the first declared menu (v1 limitation)', fallback.length === 2 && fallback[0].label === 'Home');

  console.log('4. asset()');
  const assetUrl = withZeroMongoCheck('asset()', () => api.asset('public/fonts/Inter.woff2'));
  check('asset() delegates to AssetManager for a public (unhashed) path', assetUrl === '/theme-engine-assets/api-fixture-theme/public/fonts/Inter.woff2', assetUrl);

  console.log('5. image()');
  const imgUrl = withZeroMongoCheck('image()', () => api.image('/uploads/photo.jpg', { width: 400 }));
  check('image() resolves via the pure imageBridge', imgUrl === '/uploads/photo.jpg', imgUrl);

  console.log('6. settings() — manifest defaults merged with saved overrides');
  const settings = withZeroMongoCheck('settings()', () => api.settings());
  check('overridden key uses the saved value', settings.accentColor === '#ff0000', JSON.stringify(settings));
  check('non-overridden key falls back to the manifest default', settings.showBanner === false, JSON.stringify(settings));

  console.log('7. blocks() — registered block renders via the theme, unregistered falls back to the CMS renderer');
  const elements = withZeroMongoCheck('blocks()', () => api.blocks());
  check('one element per input block, in order', elements.length === 2);
  const heroHtml = renderToStaticMarkup(elements[0]);
  check('the registered "hero" block actually renders via its theme Renderer', heroHtml.includes('hero') && heroHtml.includes('Welcome'), heroHtml);
  // "unregistered-type" isn't a real CMS block type either, so the CMS's own
  // RenderBlock falls through to its null-returning default case (confirmed
  // in renderblock.tsx) — a real, empty wrapper element, never a throw and
  // never the last-resort placeholder (that only fires if the CMS renderer
  // itself throws, which a merely-unknown type does not do).
  const fallbackHtml = renderToStaticMarkup(elements[1]);
  check('an unregistered type falls back to the CMS renderer without throwing', typeof fallbackHtml === 'string', fallbackHtml);
  check('the last-resort "not supported" placeholder is NOT used for a type the CMS itself simply ignores', !fallbackHtml.includes('not supported by this theme'), fallbackHtml);

  console.log("7b. the CMS fallback renders REAL content for a real (theme-uncovered) block type, in the app's real Redux context");
  {
    // Real editor block components (TextBlock etc.) call Redux hooks
    // unconditionally, so this only works inside a real <Provider> — which is
    // exactly how it runs in the actual app (RootLayout mounts ReduxProvider
    // around every page, public ones included).
    const realTextBlockApi = new ThemeApiImpl({
      input: {
        ...renderInput,
        blocks: [{ id: 'b3', type: 'text', data: { uniqueId: 'b3', type: 'text', content: 'Real CMS fallback content' } }],
      },
      loadedTheme, // declares no "text" block renderer -> must fall back
      assets,
    });
    const textElements = realTextBlockApi.blocks();
    const textHtml = renderToStaticMarkup(React.createElement(ReduxProvider, null, textElements[0]));
    check('a real "text" block renders its actual content through the CMS fallback', textHtml.includes('Real CMS fallback content'), textHtml);
  }

  console.log('8. currentUser() / logo()');
  const user = withZeroMongoCheck('currentUser()', () => api.currentUser());
  check('currentUser() returns RenderInput.currentUser', user?.id === 'u1' && user?.role === 'Admin');
  const logo = withZeroMongoCheck('logo()', () => api.logo());
  check('logo() reads settings.logo', logo === '/siteicon/logo.png');

  console.log('9. header() / footer()');
  const headerEl = withZeroMongoCheck('header()', () => api.header());
  check('header() renders the theme-loaded Header partial', renderToStaticMarkup(headerEl).includes('Fixture Header'));
  const footerEl = withZeroMongoCheck('footer()', () => api.footer());
  check('footer() renders the theme-loaded Footer partial', renderToStaticMarkup(footerEl).includes('Fixture Footer'));

  console.log('10. header()/footer() fall back to a minimal built-in default when the theme declares no partial');
  const bareTheme: LoadedTheme = { manifest, templates: {}, partials: {}, blocks: {} };
  const bareApi = new ThemeApiImpl({ input: renderInput, loadedTheme: bareTheme, assets });
  const bareHeaderHtml = renderToStaticMarkup(bareApi.header());
  check('no Header partial -> a non-empty built-in default, not a throw', bareHeaderHtml.length > 0 && bareHeaderHtml.includes('Fixture Site'), bareHeaderHtml);
  const bareFooterHtml = renderToStaticMarkup(bareApi.footer());
  check('no Footer partial -> a non-empty built-in default, not a throw', bareFooterHtml.length > 0 && bareFooterHtml.includes('Fixture Site'), bareFooterHtml);

  console.log('11. currentUser() is null when RenderInput has none');
  const noUserApi = new ThemeApiImpl({ input: { ...renderInput, currentUser: undefined }, loadedTheme, assets });
  check('currentUser() -> null, not undefined or a throw', noUserApi.currentUser() === null);

  console.log(`\n(Mongo query spy saw ${queryExecCalls} total calls across the whole run — should be 0)`);
  check('TOTAL: zero Mongo query calls across every ThemeAPI method, for the whole script', queryExecCalls === 0);

  mongoose.Query.prototype.exec = originalExec;
  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
}

main();
