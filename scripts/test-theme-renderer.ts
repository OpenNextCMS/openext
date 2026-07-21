/**
 * Module 10 (ThemeRenderer) verification — real Mongo + real filesystem +
 * real compile/import (builds on modules 3/4/6/8/9), proven by actually
 * rendering the returned element with react-dom/server.
 *
 * Run: npx tsx scripts/test-theme-renderer.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { getPageDbConnection, closeAllConnections } from '../src/utils/db';
import { ThemeInstaller } from '../src/modules/themeEngine/ThemeInstaller';
import { ThemeRegistry } from '../src/modules/themeEngine/ThemeRegistry';
import { ThemeRenderer } from '../src/modules/themeEngine/ThemeRenderer';
import { themeCache } from '../src/modules/themeEngine/ThemeCache';
import { getEngineThemeModel } from '../src/modules/themeEngine/models/Theme';
import { getEngineThemeSettingsModel, SINGLETON_ID } from '../src/modules/themeEngine/models/ThemeSettings';
import { ThemeRenderError, ThemeLoadError, TemplateResolutionError } from '../src/modules/themeEngine/errors';
import { THEMES_ROOT, COMPILED_ROOT } from '../src/modules/themeEngine/config';
import type { RenderInput } from '../src/modules/themeEngine/types';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function manifestJson(name: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify(
    {
      name,
      author: 'Test Suite',
      version: '1.0.0',
      compatibleCmsVersion: '^2.0.0',
      templates: { index: 'templates/Index.tsx' },
      partials: { header: 'partials/Header.tsx', footer: 'partials/Footer.tsx' },
      blocks: [{ type: 'hero', rendererPath: 'blocks/Hero/Renderer.tsx' }],
      ...overrides,
    },
    null,
    2
  );
}

// The Template component calls `theme.blocks()` itself, matching spec §4.10's
// described flow ("the resolved template ... internally calls theme.blocks()").
const INDEX_TSX = `export default function Index({ theme }: { theme: any }) {
  return (
    <main className="renderer-fixture-body">
      {theme.blocks()}
    </main>
  );
}
`;
const HEADER_TSX = `export default function Header() {
  return <header className="renderer-fixture-header">Renderer Fixture Header</header>;
}
`;
const FOOTER_TSX = `export default function Footer() {
  return <footer className="renderer-fixture-footer">Renderer Fixture Footer</footer>;
}
`;
const HERO_TSX = `export default function Hero({ block }: { block: { data: Record<string, unknown> } }) {
  return <div className="hero-block">{String(block.data.title ?? '')}</div>;
}
`;
// Passes ThemeValidator's static default-export check but throws at import-eval
// time — the realistic way `templates.index` can still fail to LOAD even though
// ThemeValidator guaranteed the manifest declares it (spec §4.8's "should be
// impossible given validation, but defend anyway").
const BROKEN_INDEX_TSX = `const boom = (globalThis as unknown as { nope: { explode: () => void } }).nope.explode();
export default function Index() {
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
  const registry = new ThemeRegistry();
  const renderer = new ThemeRenderer();
  const installedBy = new mongoose.Types.ObjectId();

  const slug = 'renderer-fixture-theme';
  const previewSlug = 'renderer-fixture-preview-theme';
  const brokenSlug = 'renderer-fixture-broken-index';

  // ---- clean slate ------------------------------------------------------------
  await ThemeModel.deleteMany({ slug: { $in: [slug, previewSlug, brokenSlug] } });
  await SettingsModel.deleteOne({ _id: SINGLETON_ID });
  for (const s of [slug, previewSlug, brokenSlug]) {
    await fs.rm(path.join(THEMES_ROOT, s), { recursive: true, force: true });
    await fs.rm(path.join(COMPILED_ROOT, s), { recursive: true, force: true });
  }
  themeCache.invalidateAll();

  const fixtureInput: RenderInput = {
    page: { id: 'p1', slug: 'home', title: 'Home', type: 'home' },
    blocks: [{ id: 'b1', type: 'hero', data: { title: 'Rendered via theme.blocks()' } }],
    menus: [{ key: 'primary', items: [{ id: 'l0', label: 'Home', url: '/' }] }],
    settings: { name: 'Renderer Fixture Site', url: 'https://renderer-fixture.example.com', description: 'desc', logo: null },
    currentUser: null,
  };

  // ---- setup: install + activate the main fixture theme -----------------------
  console.log('setup: installing + activating the main fixture theme');
  await installer.install(
    await buildZip({
      'theme.json': manifestJson('Renderer Fixture Theme'),
      'templates/Index.tsx': INDEX_TSX,
      'partials/Header.tsx': HEADER_TSX,
      'partials/Footer.tsx': FOOTER_TSX,
      'blocks/Hero/Renderer.tsx': HERO_TSX,
      'assets/style.css': '.fixture{color:red}',
    }),
    { installedBy }
  );
  await registry.activate(slug, installedBy);

  // ---- 1. render() against the active theme ------------------------------------
  console.log('1. render() against the active theme produces a real Header+Template+Footer tree');
  const result = await renderer.render(fixtureInput);
  check('usedFallback === false', result.usedFallback === false);
  check('stylesheetUrl is a real, hashed theme-assets URL', result.stylesheetUrl.startsWith(`/theme-engine-assets/${slug}/assets/style.css?v=`), result.stylesheetUrl);
  check('scriptUrl has no hash (theme ships no theme.js)', result.scriptUrl === `/theme-engine-assets/${slug}/assets/theme.js`, result.scriptUrl);

  const html = renderToStaticMarkup(result.element);
  check('Header renders', html.includes('Renderer Fixture Header'), html);
  check('Template body renders', html.includes('renderer-fixture-body'), html);
  check('Template called theme.blocks() and the hero block rendered', html.includes('Rendered via theme.blocks()'), html);
  check('Footer renders', html.includes('Renderer Fixture Footer'), html);
  // Order: Header, then body, then Footer.
  check(
    'elements appear in Header -> Template -> Footer order',
    html.indexOf('Renderer Fixture Header') < html.indexOf('renderer-fixture-body') && html.indexOf('renderer-fixture-body') < html.indexOf('Renderer Fixture Footer'),
    html
  );

  // ---- 2. previewThemeSlug bypasses the active theme ----------------------------
  console.log('2. previewThemeSlug bypasses the active theme entirely');
  await installer.install(
    await buildZip({
      'theme.json': manifestJson('Renderer Fixture Preview Theme', { partials: { header: 'partials/Header.tsx' }, blocks: [] }),
      'templates/Index.tsx': `export default function Index() { return <main className="preview-body">Preview Theme Body</main>; }\n`,
      'partials/Header.tsx': `export default function Header() { return <header className="preview-header">Preview Header</header>; }\n`,
    }),
    { installedBy }
  );
  // Deliberately NOT activated — only reachable via previewThemeSlug.
  const previewResult = await renderer.render({ ...fixtureInput, previewThemeSlug: previewSlug });
  const previewHtml = renderToStaticMarkup(previewResult.element);
  check('preview render uses the PREVIEW theme, not the active one', previewHtml.includes('Preview Header') && previewHtml.includes('Preview Theme Body'), previewHtml);
  check('preview render does NOT contain the active theme\'s markup', !previewHtml.includes('Renderer Fixture Header'), previewHtml);

  const stillActive = await registry.getActive();
  check('activating was never touched by a mere preview render', stillActive?.slug === slug, stillActive?.slug);

  // ---- 3. TemplateResolutionError: index declared+validated but fails to LOAD ---
  console.log('3. a theme whose templates.index fails to load (not to validate) -> TemplateResolutionError, not a crash');
  await installer.install(
    await buildZip({
      'theme.json': manifestJson('Renderer Fixture Broken Index', { partials: {}, blocks: [] }),
      'templates/Index.tsx': BROKEN_INDEX_TSX,
    }),
    { installedBy }
  );
  let rejectedTyped = false;
  try {
    await renderer.render({ ...fixtureInput, previewThemeSlug: brokenSlug });
    check('render() rejects rather than resolving', false, 'did not throw');
  } catch (err) {
    rejectedTyped = err instanceof TemplateResolutionError;
    check('render() rejects with TemplateResolutionError (propagated as-is, not wrapped)', rejectedTyped, String(err));
  }
  check('the process is still alive and able to do more work after the rejection (no crash)', true);

  // ---- 4. unknown/missing theme slug -> ThemeLoadError propagates as-is ----------
  console.log('4. previewThemeSlug pointing at a theme that does not exist -> ThemeLoadError, not wrapped');
  try {
    await renderer.render({ ...fixtureInput, previewThemeSlug: 'totally-does-not-exist-xyz' });
    check('render() rejects', false, 'did not throw');
  } catch (err) {
    check('render() rejects with ThemeLoadError specifically (unwrapped)', err instanceof ThemeLoadError, String(err));
    check('NOT wrapped in a generic ThemeRenderError', !(err instanceof ThemeRenderError), String(err));
  }

  // ---- 5. no active theme and no preview -> typed ThemeRenderError ---------------
  console.log('5. no active theme + no previewThemeSlug -> typed ThemeRenderError');
  await registry.deactivate(installedBy);
  try {
    await renderer.render(fixtureInput);
    check('render() rejects', false, 'did not throw');
  } catch (err) {
    check('render() rejects with ThemeRenderError when nothing is active/previewed', err instanceof ThemeRenderError, String(err));
  }

  // ---- cleanup --------------------------------------------------------------------
  await ThemeModel.deleteMany({ slug: { $in: [slug, previewSlug, brokenSlug] } });
  await SettingsModel.deleteOne({ _id: SINGLETON_ID });
  for (const s of [slug, previewSlug, brokenSlug]) {
    await fs.rm(path.join(THEMES_ROOT, s), { recursive: true, force: true });
    await fs.rm(path.join(COMPILED_ROOT, s), { recursive: true, force: true });
  }
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
