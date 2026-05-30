/**
 * Live smoke test for the v2 AI "prompt tab" page generator.
 *
 * It performs a REAL end-to-end generation: POSTs a prompt to
 * /api/ai/generate-page-json (which runs the v2 master prompt → OpenRouter
 * model → v2 reviewer → normalizeV2Document → editor translators), then
 * validates the BlockData tree that comes back — the same data the prompt
 * tab inserts onto the canvas.
 *
 * Prerequisites:
 *   1. The dev server is running:  npm run dev   (http://localhost:3011)
 *   2. An OpenRouter API key is configured (Dashboard → AI Settings, or
 *      OPENROUTER_API_KEY in .env). The route reads it server-side.
 *   3. .env provides JWT_SECRET (used to mint the auth cookie).
 *
 * Run:  npm run test:v2
 * Env overrides: TEST_BASE_URL, TEST_PROMPT, TEST_USER_ID, TEST_TIMEOUT_MS.
 */

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3011';
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const USER_ID = process.env.TEST_USER_ID || '000000000000000000000000';
const TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS || 180000);
const PROMPT =
  process.env.TEST_PROMPT ||
  'Create a modern landing page for a B2B SaaS analytics platform called Pulse that helps product teams track user engagement. Include pricing and testimonials.';

const die = (msg) => {
  console.error(`\n❌ LIVE TEST FAILED: ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

// A real (decodable) token — single-page mode only checks the cookie exists.
const token = jwt.sign({ userId: USER_ID, email: 'livetest@opennext.local' }, SECRET, {
  expiresIn: '1h',
});

console.log(`▶ POST ${BASE}/api/ai/generate-page-json`);
console.log(`  prompt: "${PROMPT.slice(0, 80)}${PROMPT.length > 80 ? '…' : ''}"`);

const form = new FormData();
form.append('prompt', PROMPT);
form.append('pageType', 'page');

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
const started = Date.now();

let res;
try {
  res = await fetch(`${BASE}/api/ai/generate-page-json`, {
    method: 'POST',
    headers: { Cookie: `token=${token}` },
    body: form,
    signal: controller.signal,
  });
} catch (err) {
  clearTimeout(timer);
  if (err.name === 'AbortError') die(`request timed out after ${TIMEOUT_MS}ms`);
  die(`request failed: ${err.message} — is the dev server running on ${BASE}? (npm run dev)`);
}
clearTimeout(timer);

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
const body = await res.json().catch(() => null);

if (!res.ok) {
  die(`HTTP ${res.status} — ${body?.message || 'no message'}${body?.qualityNotes ? ` | notes: ${body.qualityNotes.join('; ')}` : ''}`);
}
ok(`HTTP 200 in ${elapsed}s (model: ${body?.model || 'n/a'})`);

// ---- validate the returned BlockData tree ----------------------------------
const components = body?.components;
if (!Array.isArray(components) || components.length === 0) {
  die(`response.components is empty — body keys: ${Object.keys(body || {}).join(', ')}`);
}
ok(`received ${components.length} top-level block(s)`);

let total = 0;
let missingId = 0;
let navInBody = 0;
let withChildren = 0;
const types = new Set();
const labels = [];

const walk = (b, top = false) => {
  total++;
  if (typeof b?.uniqueId !== 'string' || !b.uniqueId) missingId++;
  if (typeof b?.type === 'string') types.add(b.type);
  if (b?.type === 'nav-bar') navInBody++;
  if (top && (b?.label || b?.description)) labels.push(b.label || b.description);
  if (Array.isArray(b?.children)) {
    withChildren++;
    b.children.forEach((col) => Array.isArray(col) && col.forEach((c) => walk(c)));
  }
};
components.forEach((b) => walk(b, true));

if (missingId > 0) die(`${missingId}/${total} block(s) missing a uniqueId`);
ok(`every block has a uniqueId (${total} blocks total, ${withChildren} layout containers)`);

if (navInBody > 0) die('a nav-bar leaked into the page body (pageType="page" scope not enforced)');
ok('no nav-bar in page body (scope enforced)');

if (total < 3) die(`only ${total} blocks — output looks too thin to be a real page`);
ok(`block types present: ${[...types].sort().join(', ')}`);

if (typeof body.qualityScore === 'number') ok(`qualityScore: ${body.qualityScore}`);
if (labels.length) console.log(`  section preview: ${labels.slice(0, 8).join(' · ')}`);

console.log('\n✅ LIVE TEST PASSED — v2 prompt tab produced a valid canvas block tree.');
