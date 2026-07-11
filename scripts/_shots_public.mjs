// Supplementary pass: re-capture auth/setup pages LOGGED OUT (no token cookie),
// overwriting the numbered files the main run produced while authenticated
// (those redirected to /dashboard). Run after screenshots.mjs.
import { chromium } from 'playwright';
import path from 'node:path';
const OUT = path.resolve('docs/screenshots');
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3011';

// filename -> path (numbers match buildRoutes() order in screenshots.mjs)
const TARGETS = [
  ['02-public-login-dark.png', '/login'],
  ['03-public-onboarding-dark.png', '/onboarding'],
  ['04-public-admin-setup-dark.png', '/admin'],
  ['05-public-language-dark.png', '/language'],
  ['06-public-mongodb-setup-dark.png', '/mongodb-setup'],
  ['07-public-mongodb-database-setup-dark.png', '/mongodb-setup/database-setup'],
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
// only dbConnection cookie — NO auth token, so pages render logged-out
await context.addCookies([
  { name: 'dbConnection', value: 'true', domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
]);
await context.addInitScript(() => {
  try { localStorage.setItem('theme', 'dark'); } catch {}
  document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = 'dark';
});

for (const [file, route] of TARGETS) {
  const page = await context.newPage();
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'load', timeout: 45_000 }).catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    const final = page.url().replace(BASE, '');
    console.log(`  ✓ ${file}  ←  ${route}${final !== route ? `  → ${final}` : ''}${resp ? '  ' + resp.status() : ''}`);
  } catch (e) {
    console.log(`  ✗ ${file}  ←  ${route}  (${e.message})`);
  }
  await page.close();
}
await context.close();
await browser.close();
console.log('done public pass');
