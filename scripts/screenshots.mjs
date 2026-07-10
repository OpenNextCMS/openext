/**
 * Capture dark-mode screenshots of OpenNext CMS routes.
 *
 * Prerequisites:
 *   1. Dev server running: npm run dev  (http://localhost:3011)
 *   2. .env with JWT_SECRET (optional — falls back to dev-secret)
 *
 * Run:  node scripts/screenshots.mjs
 * Env:  TEST_BASE_URL, JWT_SECRET, TEST_USER_ID
 */

import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3011';
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const USER_ID = process.env.TEST_USER_ID || '000000000000000000000000';

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
    exp: Math.floor(Date.now() / 1000) + 7200,
  },
  SECRET,
);

/** @type {{ file: string; path: string; auth?: boolean; waitMs?: number }[]} */
const ROUTES = [
  { file: '01-home-dark.png', path: '/' },
  { file: '02-login-dark.png', path: '/login' },
  { file: '03-onboarding-dark.png', path: '/onboarding', auth: true },
  { file: '04-dashboard-dark.png', path: '/dashboard', auth: true },
  { file: '05-ai-settings-dark.png', path: '/dashboard/ai-settings', auth: true },
  { file: '06-editor-dark.png', path: '/Editor', waitMs: 4000 },
  { file: '07-themes-dark.png', path: '/dashboard/themes/allthemes', auth: true },
  { file: '08-pages-dark.png', path: '/dashboard/pages/allpages', auth: true },
  { file: '09-blogs-dark.png', path: '/dashboard/blogs/allblogs', auth: true },
  { file: '10-plugins-dark.png', path: '/dashboard/plugins', auth: true },
  { file: '11-users-dark.png', path: '/dashboard/users', auth: true },
  { file: '12-settings-dark.png', path: '/dashboard/settings', auth: true },
  { file: '13-analytics-dark.png', path: '/dashboard/analytics', auth: true },
  { file: '14-profile-dark.png', path: '/dashboard/profile', auth: true },
  { file: '15-theme-builder-dark.png', path: '/dashboard/themes/new', auth: true, waitMs: 3000 },
];

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Dev server not reachable at ${BASE}. Run: npm run dev`);
}

async function applyDarkMode(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('theme', 'dark');
    } catch {
      // ignore
    }
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  });
}

async function capture(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });

  if (route.auth) {
    await context.addCookies([
      {
        name: 'token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'dbConnection',
        value: 'true',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  } else {
    await context.addCookies([
      {
        name: 'dbConnection',
        value: 'true',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  }

  const page = await context.newPage();
  await applyDarkMode(page);

  const url = `${BASE}${route.path}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(route.waitMs ?? 2000);

  const outPath = path.join(OUT_DIR, route.file);
  await page.screenshot({ path: outPath, fullPage: true });
  await context.close();

  console.log(`  ✓ ${route.file}  ←  ${route.path}`);
  return outPath;
}

console.log(`▶ OpenNext CMS dark-mode screenshots`);
console.log(`  base: ${BASE}`);
console.log(`  out:  ${OUT_DIR}\n`);

await mkdir(OUT_DIR, { recursive: true });
await waitForServer();

const browser = await chromium.launch({ headless: true });

try {
  for (const route of ROUTES) {
    await capture(browser, route);
  }
  console.log(`\n✅ Saved ${ROUTES.length} screenshots to docs/screenshots/`);
} finally {
  await browser.close();
}
