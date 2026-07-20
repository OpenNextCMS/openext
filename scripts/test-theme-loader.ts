/**
 * Module 6 (ThemeLoader) verification — real Mongo + real filesystem + a real
 * compile-to-CJS-and-import round trip, proven by actually rendering the
 * loaded components with react-dom/server.
 *
 * Prerequisites: the same .env this app uses (MongoDB connection + PAGE_DB_NAME).
 * Run: npx tsx scripts/test-theme-loader.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { getPageDbConnection, closeAllConnections } from '../src/utils/db';
import { ThemeInstaller } from '../src/modules/themeEngine/ThemeInstaller';
import { ThemeLoader } from '../src/modules/themeEngine/ThemeLoader';
import { themeCache } from '../src/modules/themeEngine/ThemeCache';
import { getEngineThemeModel } from '../src/modules/themeEngine/models/Theme';
import { getEngineThemeSettingsModel, SINGLETON_ID } from '../src/modules/themeEngine/models/ThemeSettings';
import { ThemeLoadError } from '../src/modules/themeEngine/errors';
import { THEMES_ROOT, COMPILED_ROOT } from '../src/modules/themeEngine/config';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function manifestJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify(
    {
      name: 'Loader Fixture Theme',
      author: 'Test Suite',
      version: '1.0.0',
      compatibleCmsVersion: '^2.0.0',
      templates: { index: 'templates/Index.tsx', home: 'templates/Home.tsx' },
      partials: { header: 'partials/Header.tsx' },
      blocks: [
        { type: 'hero', rendererPath: 'blocks/Hero/Renderer.tsx', schemaPath: 'blocks/Hero/schema.ts' },
        { type: 'broken', rendererPath: 'blocks/Broken/Renderer.tsx' },
      ],
      ...overrides,
    },
    null,
    2
  );
}

// Real JSX — proves the TS-compile + JSX-transform + CJS-import pipeline actually works.
const INDEX_TSX = `export default function Index() {
  return <div className="index-page">Hello, <strong>theme engine</strong>!</div>;
}
`;
const HOME_TSX = `export default function Home() {
  return <section id="home">Welcome home</section>;
}
`;
const HEADER_TSX = `export default function Header() {
  return <header>Fixture Header</header>;
}
`;
const HERO_TSX = `export default function Hero() {
  return <div className="hero">Hero block</div>;
}
`;
const HERO_SCHEMA_TS = `export default { title: 'string', subtitle: 'string' };\n`;
// Passes ThemeValidator's STATIC default-export check (valid syntax, real default
// export) but throws when actually EVALUATED at import time — the realistic case
// ThemeLoader (not ThemeValidator) has to catch.
const BROKEN_TSX = `const boom = (globalThis as unknown as { doesNotExist: { explode: () => void } }).doesNotExist.explode();
export default function Broken() {
  return null;
}
`;

async function buildZip(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [rel, content] of Object.entries(files)) zip.file(rel, content);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function main() {
  const pageDb = await getPageDbConnection();
  const ThemeModel = getEngineThemeModel(pageDb);
  const SettingsModel = getEngineThemeSettingsModel(pageDb);
  const installer = new ThemeInstaller();
  const loader = new ThemeLoader();
  const installedBy = new mongoose.Types.ObjectId();
  const slug = 'loader-fixture-theme';

  // ---- clean slate ------------------------------------------------------------
  await ThemeModel.deleteOne({ slug });
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });
  await fs.rm(path.join(COMPILED_ROOT, slug), { recursive: true, force: true });
  themeCache.invalidateAll();

  // ---- install a real fixture theme with one file that fails at import-time ---
  console.log('setup: installing the fixture theme (passes validation, one block fails at load)');
  await installer.install(
    await buildZip({
      'theme.json': manifestJson(),
      'templates/Index.tsx': INDEX_TSX,
      'templates/Home.tsx': HOME_TSX,
      'partials/Header.tsx': HEADER_TSX,
      'blocks/Hero/Renderer.tsx': HERO_TSX,
      'blocks/Hero/schema.ts': HERO_SCHEMA_TS,
      'blocks/Broken/Renderer.tsx': BROKEN_TSX,
    }),
    { installedBy }
  );

  // ---- 1. loadTheme() returns real, renderable components ----------------------
  console.log('1. loadTheme() returns real components; broken block degrades gracefully');
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };
  let loaded;
  try {
    loaded = await loader.loadTheme(slug);
  } finally {
    console.warn = originalWarn;
  }

  check('does not throw despite the broken block', loaded !== undefined);
  check('templates.index resolved', typeof loaded?.templates.index === 'function');
  check('templates.home resolved', typeof loaded?.templates.home === 'function');
  check('partials.Header resolved', typeof loaded?.partials.Header === 'function');
  check('blocks.hero resolved with a Renderer + schema', typeof loaded?.blocks.hero?.Renderer === 'function' && !!loaded?.blocks.hero?.schema);
  check('blocks.broken is ABSENT (not thrown, just missing)', loaded?.blocks.broken === undefined);
  check('a warning was logged for the broken block', warnings.some((w) => w.includes('blocks/Broken/Renderer.tsx')), JSON.stringify(warnings));

  // ---- 2. the loaded components actually RENDER real markup --------------------
  console.log('2. loaded components render real markup via react-dom/server');
  if (loaded) {
    const indexHtml = renderToStaticMarkup(React.createElement(loaded.templates.index));
    check('Index renders expected markup', indexHtml.includes('index-page') && indexHtml.includes('theme engine'), indexHtml);
    const homeHtml = renderToStaticMarkup(React.createElement(loaded.templates.home));
    check('Home renders expected markup', homeHtml.includes('id="home"') && homeHtml.includes('Welcome home'), homeHtml);
    const headerHtml = renderToStaticMarkup(React.createElement(loaded.partials.Header!));
    check('Header partial renders expected markup', headerHtml.includes('Fixture Header'), headerHtml);
    const heroHtml = renderToStaticMarkup(React.createElement(loaded.blocks.hero.Renderer));
    check('Hero block renders expected markup', heroHtml.includes('Hero block'), heroHtml);
    check('Hero schema default-export value is preserved', (loaded.blocks.hero.schema as { title?: string })?.title === 'string');
  }

  // ---- 3. compiled artifacts + cache are actually populated (not recompiled per call) --
  console.log('3. compiled artifacts + component cache populated');
  const compiledIndexPath = path.join(COMPILED_ROOT, slug, '1.0.0', 'templates', 'Index.tsx.cjs');
  const compiledExists = await fs.stat(compiledIndexPath).then(() => true).catch(() => false);
  check('compiled .cjs artifact written to disk, version-scoped', compiledExists, compiledIndexPath);
  check('ThemeCache holds cached component modules after loadTheme()', themeCache.stats().componentModules > 0, JSON.stringify(themeCache.stats()));

  // ---- 4. unknown / uninstalled slug throws ThemeLoadError -----------------------
  console.log('4. loadTheme() on an unknown slug throws ThemeLoadError');
  try {
    await loader.loadTheme('totally-unknown-slug-xyz');
    check('throws ThemeLoadError', false, 'did not throw');
  } catch (err) {
    check('throws ThemeLoadError', err instanceof ThemeLoadError, String(err));
  }

  // ---- 5. an upgrade never serves a stale compiled component (version-scoped cache) --
  console.log('5. upgrade to a new version picks up new content, not a stale cache');
  await installer.install(
    await buildZip({
      'theme.json': manifestJson({ version: '2.0.0' }),
      'templates/Index.tsx': `export default function Index() {\n  return <div className="index-page">Version two content</div>;\n}\n`,
      'templates/Home.tsx': HOME_TSX,
      'partials/Header.tsx': HEADER_TSX,
      'blocks/Hero/Renderer.tsx': HERO_TSX,
      'blocks/Hero/schema.ts': HERO_SCHEMA_TS,
      'blocks/Broken/Renderer.tsx': BROKEN_TSX,
    }),
    { installedBy, replace: true }
  );
  const loadedV2 = await loader.loadTheme(slug);
  const v2Html = renderToStaticMarkup(React.createElement(loadedV2.templates.index));
  check('v2 Index renders the NEW content', v2Html.includes('Version two content'), v2Html);
  check('v2 Index does NOT render the old v1 text', !v2Html.includes('Hello,'), v2Html);
  const compiledV1StillThere = await fs.stat(path.join(COMPILED_ROOT, slug, '1.0.0', 'templates', 'Index.tsx.cjs')).then(() => true).catch(() => false);
  const compiledV2Exists = await fs.stat(path.join(COMPILED_ROOT, slug, '2.0.0', 'templates', 'Index.tsx.cjs')).then(() => true).catch(() => false);
  check('v1 compiled artifact untouched', compiledV1StillThere);
  check('v2 gets its own compiled artifact', compiledV2Exists);

  // ---- cleanup --------------------------------------------------------------------
  await ThemeModel.deleteOne({ slug });
  await SettingsModel.updateOne({ _id: SINGLETON_ID }, { $unset: { activeThemeSlug: '' } }).catch(() => undefined);
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });
  await fs.rm(path.join(COMPILED_ROOT, slug), { recursive: true, force: true });
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
