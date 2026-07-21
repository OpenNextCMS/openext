/**
 * Module 12 (ThemeManager) verification — real Mongo + real filesystem +
 * the real shipped-in-repo default theme, installed through the real pipeline.
 *
 * Run: npx tsx scripts/test-theme-manager.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { getPageDbConnection, closeAllConnections } from '../src/utils/db';
import { ThemeManager } from '../src/modules/themeEngine/ThemeManager';
import { ThemeRenderer } from '../src/modules/themeEngine/ThemeRenderer';
import { themeCache } from '../src/modules/themeEngine/ThemeCache';
import { getEngineThemeModel } from '../src/modules/themeEngine/models/Theme';
import { getEngineThemeSettingsModel, SINGLETON_ID } from '../src/modules/themeEngine/models/ThemeSettings';
import { DEFAULT_THEME_SLUG, THEMES_ROOT, COMPILED_ROOT } from '../src/modules/themeEngine/config';
import type { RenderInput, RenderResult } from '../src/modules/themeEngine/types';

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
      ...overrides,
    },
    null,
    2
  );
}

const GOOD_INDEX_TSX = `export default function Index({ theme }: { theme: any }) {
  return <main className="manager-fixture-good">{theme.blocks()}</main>;
}
`;
const HERO_RENDERER_TSX = `export default function Hero({ block }: { block: { data: Record<string, unknown> } }) {
  return <div className="hero-block">{String(block.data.title ?? '')}</div>;
}
`;
// Passes ThemeValidator's static check but throws at import-eval time.
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

/** A ThemeRenderer stand-in whose render() always throws — used to prove the "exactly one retry, no further recursion" guarantee without needing the real shipped default theme to ever break. */
class AlwaysThrowRenderer extends ThemeRenderer {
  public callCount = 0;
  async render(): Promise<RenderResult> {
    this.callCount += 1;
    throw new Error(`forced failure, attempt #${this.callCount}`);
  }
}

async function main() {
  const pageDb = await getPageDbConnection();
  const ThemeModel = getEngineThemeModel(pageDb);
  const SettingsModel = getEngineThemeSettingsModel(pageDb);
  const manager = new ThemeManager();
  const installedBy = new mongoose.Types.ObjectId();

  const goodSlug = 'manager-fixture-good-theme';
  const brokenSlug = 'manager-fixture-broken-theme';

  // ---- clean slate --------------------------------------------------------------
  await ThemeModel.deleteMany({ slug: { $in: [goodSlug, brokenSlug] } });
  await SettingsModel.deleteOne({ _id: SINGLETON_ID });
  for (const s of [goodSlug, brokenSlug]) {
    await fs.rm(path.join(THEMES_ROOT, s), { recursive: true, force: true });
    await fs.rm(path.join(COMPILED_ROOT, s), { recursive: true, force: true });
  }
  themeCache.invalidateAll();

  const fixtureInput: RenderInput = {
    page: { id: 'p1', slug: 'home', title: 'Home', type: 'home' },
    blocks: [{ id: 'b1', type: 'hero', data: { title: 'Manager fixture content' } }],
    menus: [{ key: 'primary', items: [] }],
    settings: { name: 'Manager Fixture Site', url: 'https://manager-fixture.example.com', description: 'desc', logo: null },
    currentUser: null,
  };

  // ---- 1. facade methods (uploadAndInstall / activate / listInstalled) ------------
  console.log('1. facade methods: uploadAndInstall() / activate() / listInstalled()');
  const installedDoc = await manager.uploadAndInstall(
    await buildZip({
      'theme.json': manifestJson('Manager Fixture Good Theme', { blocks: [{ type: 'hero', rendererPath: 'blocks/Hero/Renderer.tsx' }] }),
      'templates/Index.tsx': GOOD_INDEX_TSX,
      'blocks/Hero/Renderer.tsx': HERO_RENDERER_TSX,
    }),
    installedBy
  );
  check('uploadAndInstall() returns an installed ThemeDocument', installedDoc.status === 'installed' && installedDoc.slug === goodSlug, installedDoc.slug);
  await manager.activate(goodSlug, installedBy);
  const listed = await manager.listInstalled();
  check('listInstalled() includes the fixture', listed.some((t) => t.slug === goodSlug));

  // ---- 2. normal renderPage() succeeds, no fallback --------------------------------
  console.log('2. renderPage() against a healthy active theme succeeds without any fallback');
  const normalResult = await manager.renderPage(fixtureInput);
  check('usedFallback === false', normalResult.usedFallback === false);
  const normalHtml = renderToStaticMarkup(normalResult.element);
  check('renders the real theme content', normalHtml.includes('manager-fixture-good') && normalHtml.includes('Manager fixture content'), normalHtml);
  check('does NOT contain the fallback notice', !normalHtml.includes('theme-engine-fallback-notice'), normalHtml);

  // ---- 3. active theme fails at render time -> exactly one retry against the REAL default theme --
  console.log('3. active theme fails -> real fallback to the shipped default theme, usedFallback === true');
  await manager.uploadAndInstall(
    await buildZip({ 'theme.json': manifestJson('Manager Fixture Broken Theme'), 'templates/Index.tsx': BROKEN_INDEX_TSX }),
    installedBy
  );
  await manager.activate(brokenSlug, installedBy);

  const fallbackResult = await manager.renderPage(fixtureInput);
  check('renderPage() does NOT throw even though the active theme is broken', true);
  check('usedFallback === true', fallbackResult.usedFallback === true);
  const fallbackHtml = renderToStaticMarkup(fallbackResult.element);
  check('rendered markup is the REAL default theme (fallback notice present)', fallbackHtml.includes('theme-engine-fallback-notice'), fallbackHtml);
  // The default theme declares no "hero" block renderer, so ThemeAPI falls
  // back to the CMS's own renderer for it (module 9's CMS-fallback path) —
  // proven here by never crashing, not by any particular markup shape (the
  // fixture's "hero" block data doesn't match the real Hero component's
  // expected content shape, so it renders an empty-but-real wrapper — that's
  // still a successful, non-throwing fallback).
  check('unregistered block type in the default theme falls back without crashing the page', typeof fallbackHtml === 'string' && fallbackHtml.length > 0, fallbackHtml);

  const defaultThemeDoc = await ThemeModel.findOne({ slug: DEFAULT_THEME_SLUG });
  check('the default theme was installed automatically, through the real pipeline', defaultThemeDoc?.status === 'installed', String(defaultThemeDoc?.status));

  // Idempotency: render the fallback path again and confirm no duplicate install.
  await manager.renderPage(fixtureInput);
  const defaultThemeCount = await ThemeModel.countDocuments({ slug: DEFAULT_THEME_SLUG });
  check('the default theme is installed exactly once even after repeated fallbacks', defaultThemeCount === 1, String(defaultThemeCount));

  // The broken theme stays the ACTIVE one — fallback never touches activation state.
  const stillActiveSlug = (await SettingsModel.findOne({ _id: SINGLETON_ID }).lean())?.activeThemeSlug;
  check('the broken theme remains the recorded active theme (fallback is render-only, not a re-activation)', stillActiveSlug === brokenSlug, String(stillActiveSlug));

  // ---- 4. when BOTH primary and fallback fail -> hard failure, exactly 2 attempts, no recursion --
  console.log('4. both primary and fallback fail -> rejects, exactly 2 render attempts, no further recursion');
  const throwingRenderer = new AlwaysThrowRenderer();
  const managerWithThrowingRenderer = new ThemeManager(undefined, undefined, throwingRenderer, undefined);
  try {
    await managerWithThrowingRenderer.renderPage(fixtureInput);
    check('renderPage() rejects when the default theme also fails', false, 'did not throw');
  } catch (err) {
    check('renderPage() rejects when the default theme also fails', err instanceof Error, String(err));
  }
  check('render() was attempted EXACTLY twice: primary + one fallback, no more', throwingRenderer.callCount === 2, String(throwingRenderer.callCount));

  // ---- cleanup ----------------------------------------------------------------------
  await ThemeModel.deleteMany({ slug: { $in: [goodSlug, brokenSlug] } });
  await SettingsModel.deleteOne({ _id: SINGLETON_ID });
  for (const s of [goodSlug, brokenSlug]) {
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
