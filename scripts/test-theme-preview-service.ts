/**
 * Module 11 (ThemePreviewService) verification — real Mongo (real TTL index
 * inspected via getIndexes()) + a real installed fixture theme.
 *
 * Run: npx tsx scripts/test-theme-preview-service.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { getPageDbConnection, closeAllConnections } from '../src/utils/db';
import { ThemeInstaller } from '../src/modules/themeEngine/ThemeInstaller';
import { ThemePreviewService } from '../src/modules/themeEngine/ThemePreviewService';
import { getEngineThemeModel } from '../src/modules/themeEngine/models/Theme';
import { getEngineThemePreviewSessionModel } from '../src/modules/themeEngine/models/ThemePreviewSession';
import { ThemeNotFoundError } from '../src/modules/themeEngine/errors';
import { THEMES_ROOT } from '../src/modules/themeEngine/config';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  // ---- 0. static source check: no cookies() access anywhere in this file --------
  console.log('0. ThemePreviewService.ts never touches cookies() directly');
  const source = await fs.readFile(
    path.join(process.cwd(), 'src/modules/themeEngine/ThemePreviewService.ts'),
    'utf8'
  );
  const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('no real import from next/headers outside comments', !codeOnly.includes('next/headers'), 'found an import from next/headers');
  check('no actual cookies() function call outside comments', !codeOnly.includes('cookies('), 'found a real cookies() call');

  const pageDb = await getPageDbConnection();
  const ThemeModel = getEngineThemeModel(pageDb);
  const SessionModel = getEngineThemePreviewSessionModel(pageDb);
  const installer = new ThemeInstaller();
  const service = new ThemePreviewService();
  const installedBy = new mongoose.Types.ObjectId();
  const slug = 'preview-service-fixture-theme';

  await ThemeModel.deleteOne({ slug });
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });
  await SessionModel.deleteMany({ themeSlug: { $regex: /^preview-service-fixture/ } });

  const zip = new JSZip();
  zip.file('theme.json', JSON.stringify({ name: 'Preview Service Fixture Theme', author: 'Test', version: '1.0.0', compatibleCmsVersion: '^2.0.0', templates: { index: 'templates/Index.tsx' } }));
  zip.file('templates/Index.tsx', 'export default function Index() { return null; }\n');
  await installer.install(await zip.generateAsync({ type: 'nodebuffer' }), { installedBy });

  // ---- 1. TTL + uniqueness indexes are really there ------------------------------
  console.log('1. real MongoDB indexes (TTL on expiresAt, unique on token)');
  const indexes = await SessionModel.collection.indexes();
  const ttlIndex = indexes.find((ix) => ix.key && 'expiresAt' in ix.key);
  check('an index on expiresAt exists', !!ttlIndex, JSON.stringify(indexes));
  check('that index has expireAfterSeconds: 0 (TTL, expires exactly at the stored date)', ttlIndex?.expireAfterSeconds === 0, JSON.stringify(ttlIndex));
  const tokenIndex = indexes.find((ix) => ix.key && 'token' in ix.key);
  check('a unique index on token exists', !!tokenIndex && tokenIndex.unique === true, JSON.stringify(tokenIndex));

  // ---- 2. startPreview() on an unknown slug -------------------------------------
  console.log('2. startPreview() on an unknown slug');
  try {
    await service.startPreview('totally-unknown-slug-xyz', installedBy);
    check('throws ThemeNotFoundError', false, 'did not throw');
  } catch (err) {
    check('throws ThemeNotFoundError', err instanceof ThemeNotFoundError, String(err));
  }

  // ---- 3. startPreview() / getPreviewTheme() / endPreview() round trip -----------
  console.log('3. start -> get -> end round trip');
  const ticket = await service.startPreview(slug, installedBy);
  check('token is a non-empty opaque string', typeof ticket.token === 'string' && ticket.token.length >= 32, ticket.token);
  check('expiresAt is roughly 30 minutes out', ticket.expiresAt.getTime() - Date.now() > 25 * 60 * 1000 && ticket.expiresAt.getTime() - Date.now() <= 30 * 60 * 1000, String(ticket.expiresAt));

  const resolvedSlug = await service.getPreviewTheme(ticket.token);
  check('getPreviewTheme() resolves to the right slug', resolvedSlug === slug, String(resolvedSlug));

  check('getPreviewTheme() on a bogus token -> null', (await service.getPreviewTheme('not-a-real-token')) === null);
  check('getPreviewTheme() on an empty token -> null (no Mongo round-trip needed)', (await service.getPreviewTheme('')) === null);

  await service.endPreview(ticket.token);
  check('after endPreview(), the token no longer resolves', (await service.getPreviewTheme(ticket.token)) === null);
  const stillInDb = await SessionModel.findOne({ token: ticket.token });
  check('the document was actually deleted from Mongo, not just logically hidden', stillInDb === null);

  // endPreview on an unknown/empty token must not throw.
  await service.endPreview('some-token-that-was-never-issued');
  await service.endPreview('');
  check('endPreview() on an unknown/empty token is a harmless no-op', true);

  // ---- 4. expiry is enforced at the app level, not just by the TTL sweep --------
  console.log('4. app-level expiry check (does not depend on the TTL background sweep timing)');
  const ticket2 = await service.startPreview(slug, installedBy);
  // Force it into the past directly — simulates "TTL monitor hasn't swept yet,
  // but the expiry time has already passed".
  await SessionModel.updateOne({ token: ticket2.token }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  check('an already-expired-but-still-present session resolves to null', (await service.getPreviewTheme(ticket2.token)) === null);
  await SessionModel.deleteOne({ token: ticket2.token }); // manual cleanup since we bypassed the real TTL flow

  // ---- cleanup --------------------------------------------------------------------
  await ThemeModel.deleteOne({ slug });
  await fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true });
  await SessionModel.deleteMany({ themeSlug: { $regex: /^preview-service-fixture/ } });

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  await closeAllConnections();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await closeAllConnections().catch(() => undefined);
  process.exit(1);
});
