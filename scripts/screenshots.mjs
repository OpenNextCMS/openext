/**
 * Capture full-page dark-mode screenshots of every OpenNext CMS page & feature.
 *
 * Prerequisites:
 *   1. Dev server running:  npm run dev   (http://localhost:3011)
 *   2. .env with JWT_SECRET (real SuperAdmin userId recommended via TEST_USER_ID)
 *   3. Form Builder + Menu Redirect plugins active and some demo content seeded
 *      (see scripts/_seed.mjs and scripts/_seed_content.mjs).
 *
 * Run:  npm run screenshots
 * Env:  TEST_BASE_URL, JWT_SECRET, TEST_USER_ID
 *
 * Dynamic routes ([id]/[slug]) are resolved at runtime from the app's own APIs,
 * so blog/form/theme feature pages render with real content. Routes that fail
 * are logged and skipped — the run never aborts on a single bad page.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots');

// --- minimal .env loader (no dotenv dependency) ---------------------------
const env = {};
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
  }
} catch {
  /* ignore */
}

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3011';
const SECRET = process.env.JWT_SECRET || env.JWT_SECRET || 'dev-secret';
// A REAL SuperAdmin _id unlocks plugin-guarded pages (form builder, menu redirect).
const USER_ID = process.env.TEST_USER_ID || env.TEST_USER_ID || '6a4f80fb7671b13d292aadba';

function signJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

const token = signJwt(
  {
    userId: USER_ID,
    email: 'screenshots@opennext.local',
    username: 'screenshots',
    role: 0,
    exp: Math.floor(Date.now() / 1000) + 7200,
  },
  SECRET,
);
const cookieHeader = `token=${token}; dbConnection=true`;

// --- resolve dynamic ids/slugs from the running app -----------------------
function firstArray(j) {
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.data)) return j.data;
  for (const k of ['blogs', 'forms', 'themes', 'pages', 'items', 'results']) {
    if (j && Array.isArray(j[k])) return j[k];
  }
  return [];
}
async function apiList(pathname) {
  try {
    const res = await fetch(BASE + pathname, { headers: { Cookie: cookieHeader } });
    return firstArray(await res.json());
  } catch {
    return [];
  }
}

// Groups whose pages read MongoDB. On the free-tier Atlas cluster a sustained
// crawl can tip the connection pool into cascading TLS failures; when that
// happens we ABORT (leaving those routes uncaptured) rather than write broken
// pages — a later run on a fresh server resumes and captures them.
const DB_GROUPS = new Set(['dashboard', 'blogs', 'pages', 'themes', 'plugins']);
async function dbHealthy() {
  try {
    const res = await fetch(BASE + '/api/themes', { headers: { Cookie: cookieHeader } });
    if (!res.ok) return false;
    const arr = firstArray(await res.json());
    return Array.isArray(arr) && arr.length >= 0 && res.status === 200;
  } catch {
    return false;
  }
}

async function resolveDynamics() {
  const [themes, blogs, forms, pages] = await Promise.all([
    apiList('/api/themes'),
    apiList('/api/blogs'),
    apiList('/api/forms'),
    apiList('/api/pages/get-pages'),
  ]);
  const pick = (arr, ...keys) => {
    const o = arr[0] || {};
    for (const k of keys) if (o[k] != null) return String(o[k]);
    return null;
  };
  return {
    themeId: pick(themes, '_id'),
    blogId: pick(blogs, '_id'),
    blogSlug: pick(blogs, 'slug'),
    formId: pick(forms, '_id'),
    formSlug: pick(forms, 'slug'),
    pageSlug: pick(pages, 'slug', 'pageName') || env.DEFAULT_HOME_SLUG || 'default_home',
  };
}

// --- route catalogue ------------------------------------------------------
/** Build the ordered list of routes. `d` = resolved dynamic ids/slugs. */
function buildRoutes(d) {
  const R = [];
  const add = (group, name, pathname, opts = {}) => {
    if (pathname == null) return; // skip unresolved dynamic routes
    R.push({ group, name, path: pathname, ...opts });
  };

  // --- Public & auth ---
  add('public', 'home', '/', { waitMs: 2500 });
  add('public', 'login', '/login');
  add('public', 'onboarding', '/onboarding', { waitMs: 2500 });
  add('public', 'admin-setup', '/admin');
  add('public', 'language', '/language');
  add('public', 'mongodb-setup', '/mongodb-setup');
  add('public', 'mongodb-database-setup', '/mongodb-setup/database-setup');
  add('public', 'blog-index', '/blog', { waitMs: 2500 });
  add('public', 'blog-post', d.blogSlug ? `/blog/${d.blogSlug}` : null, { waitMs: 2500 });
  add('public', 'blogs-listing', '/blogs', { waitMs: 2500 });
  add('public', 'public-page', d.pageSlug ? `/${d.pageSlug}` : null, { waitMs: 3000 });
  add('public', 'public-form', d.formSlug ? `/forms/${d.formSlug}` : null, { waitMs: 2500 });
  add('public', 'preview', '/preview', { waitMs: 2500 });
  add('public', 'doc', '/doc');
  add('public', 'default-theme-layouts', '/themes/openNextDefault/layouts', { waitMs: 2500 });

  // --- Editor ---
  add('editor', 'block-page-editor', '/Editor', { waitMs: 5000 });

  // --- Dashboard core ---
  add('dashboard', 'dashboard-home', '/dashboard', { waitMs: 3000 });
  add('dashboard', 'ai-settings', '/dashboard/ai-settings');
  add('dashboard', 'analytics', '/dashboard/analytics', { waitMs: 3000 });
  add('dashboard', 'profile', '/dashboard/profile');
  add('dashboard', 'settings', '/dashboard/settings');
  add('dashboard', 'users', '/dashboard/users');

  // --- Blogs feature ---
  add('blogs', 'blogs-all', '/dashboard/blogs/allblogs', { waitMs: 2500 });
  add('blogs', 'blog-new', '/dashboard/blogs/new', { waitMs: 3000 });
  add('blogs', 'blog-edit', d.blogId ? `/dashboard/blogs/${d.blogId}/edit` : null, { waitMs: 3500 });
  add('blogs', 'blog-categories', '/dashboard/blogs/categories');
  add('blogs', 'blog-tags', '/dashboard/blogs/tags');
  add('blogs', 'blog-design', '/dashboard/blogs/design', { waitMs: 2500 });
  add('blogs', 'blog-layout', '/dashboard/blogs/layout', { waitMs: 2500 });

  // --- Pages feature ---
  add('pages', 'pages-all', '/dashboard/pages/allpages', { waitMs: 2500 });
  add('pages', 'pages-headers', '/dashboard/pages/headers', { waitMs: 2500 });
  add('pages', 'pages-footers', '/dashboard/pages/footers', { waitMs: 2500 });

  // --- Themes feature ---
  add('themes', 'themes-all', '/dashboard/themes/allthemes', { waitMs: 2500 });
  add('themes', 'theme-builder-new', '/dashboard/themes/new', { waitMs: 3500 });
  add('themes', 'theme-add', '/dashboard/themes/addtheme', { waitMs: 2500 });
  add('themes', 'theme-detail', d.themeId ? `/dashboard/themes/${d.themeId}` : null, { waitMs: 3000 });

  // --- Plugins: Form Builder ---
  add('plugins', 'plugins-home', '/dashboard/plugins', { waitMs: 2500 });
  add('plugins', 'form-builder-list', '/dashboard/plugins/form-builder', { waitMs: 2500 });
  add('plugins', 'form-builder-new', '/dashboard/plugins/form-builder/new', { waitMs: 3500 });
  add('plugins', 'form-builder-edit', d.formId ? `/dashboard/plugins/form-builder/${d.formId}/edit` : null, { waitMs: 6000 });
  add('plugins', 'form-builder-analytics', d.formId ? `/dashboard/plugins/form-builder/${d.formId}/analytics` : null, { waitMs: 6000 });
  add('plugins', 'form-builder-submissions', d.formId ? `/dashboard/plugins/form-builder/${d.formId}/submissions` : null, { waitMs: 3000 });

  // --- Plugins: Menu Redirect ---
  add('plugins', 'menu-redirect-home', '/dashboard/plugins/menu-redirect', { waitMs: 2500 });
  add('plugins', 'menu-redirect-editor', '/dashboard/plugins/menu-redirect/editor', { waitMs: 3500 });
  add('plugins', 'menu-redirect-analytics', '/dashboard/plugins/menu-redirect/analytics', { waitMs: 2500 });
  add('plugins', 'menu-redirect-history', '/dashboard/plugins/menu-redirect/history', { waitMs: 2500 });

  return R;
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/login', { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Dev server not reachable at ${BASE}. Run: npm run dev`);
}

async function newDarkContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });
  await context.addCookies(
    [
      { name: 'token', value: token, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
      { name: 'dbConnection', value: 'true', domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
    ],
  );
  await context.addInitScript(() => {
    try {
      localStorage.setItem('theme', 'dark');
    } catch {
      /* ignore */
    }
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  });
  return context;
}

async function capture(context, route, file) {
  const page = await context.newPage();
  let status = 0;
  try {
    // 'load' (not 'networkidle') — Next.js dev keeps an HMR socket open, so
    // networkidle never fires and every page hangs to the 60s timeout.
    const resp = await page.goto(`${BASE}${route.path}`, { waitUntil: 'load', timeout: 45_000 }).catch(() => null);
    status = resp ? resp.status() : 0;
  } catch {
    /* fall through to whatever rendered */
  }
  // best-effort settle for data fetches, capped so we never hang.
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(route.waitMs ?? 2000);
  // Wait out client-side "Loading …" spinners (form builder, analytics, editors).
  await page
    .waitForFunction(
      () => {
        const t = (document.body && document.body.innerText) || '';
        return !/Loading\s+(builder|analytics|form|submissions|data|editor|preview)\b/i.test(t) && !/^\s*Loading\.\.\.\s*$/i.test(t);
      },
      { timeout: 15_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
  const finalUrl = page.url().replace(BASE, '');
  await page.close();
  return { status, finalUrl };
}

// --- main -----------------------------------------------------------------
console.log('▶ OpenNext CMS — full dark-mode screenshot set');
console.log(`  base: ${BASE}`);
console.log(`  out:  ${OUT_DIR}\n`);

await mkdir(OUT_DIR, { recursive: true });
await waitForServer();

// Resume-friendly: FRESH=1 wipes previous PNGs; otherwise already-captured
// routes are skipped so an interrupted run (e.g. a DB hiccup) can continue.
const FRESH = process.env.FRESH === '1';
if (FRESH) {
  for (const f of await readdir(OUT_DIR)) {
    if (f.endsWith('.png')) await unlink(path.join(OUT_DIR, f)).catch(() => {});
  }
}

const dyn = await resolveDynamics();
console.log('  resolved dynamics:', dyn, '\n');

const routes = buildRoutes(dyn);
const browser = await chromium.launch({ headless: true });
const context = await newDarkContext(browser);

const results = [];
let i = 0;
try {
  for (const route of routes) {
    i += 1;
    const file = `${String(i).padStart(2, '0')}-${route.group}-${route.name}-dark.png`;
    // resume: skip routes already captured with a non-trivial PNG
    try {
      const st = fs.statSync(path.join(OUT_DIR, file));
      if (!FRESH && st.size > 3000) {
        console.log(`  • ${file}  (cached, skipped)`);
        results.push({ file, group: route.group, name: route.name, path: route.path, status: 200, cached: true });
        continue;
      }
    } catch {
      /* not captured yet */
    }
    // DB health-gate: abort before writing a degraded DB page.
    if (DB_GROUPS.has(route.group)) {
      if (!(await dbHealthy())) {
        console.log(`  ⏸ DB unhealthy — aborting at ${file} so a fresh-server run can resume.`);
        break;
      }
    }
    try {
      const { status, finalUrl } = await capture(context, route, file);
      const flag = status && status >= 400 ? ` ⚠ ${status}` : '';
      const redir = finalUrl !== route.path ? `  → ${finalUrl}` : '';
      console.log(`  ✓ ${file}  ←  ${route.path}${flag}${redir}`);
      results.push({ file, group: route.group, name: route.name, path: route.path, status, finalUrl });
    } catch (e) {
      console.log(`  ✗ ${file}  ←  ${route.path}   (${e.message})`);
      results.push({ file, group: route.group, name: route.name, path: route.path, status: -1, error: e.message });
    }
  }
} finally {
  await context.close();
  await browser.close();
}

// write a machine-readable index for the README generator
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(results, null, 2));
console.log(`\n✅ Saved ${results.length} screenshots to docs/screenshots/`);
