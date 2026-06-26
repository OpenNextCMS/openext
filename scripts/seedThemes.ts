/**
 * Manual seed/re-seed of the in-code system themes into the active tenant's
 * page DB.
 *
 * The system themes are normally auto-seeded on first page-DB access (see the
 * auto-seed block in `src/utils/db.ts`). Run this script when you have ADDED or
 * EDITED a system theme and want existing tenant DBs to pick up the change
 * (auto-seed only fires when the Theme collection is empty; this script upserts
 * by slug unconditionally and is idempotent).
 *
 * Prerequisites: the same .env this app uses (MongoDB connection + PAGE_DB_NAME).
 *
 * Run:
 *   npx tsx scripts/seedThemes.ts
 * (If you hit a localStorage error, prefix with the dev polyfill:
 *   node --require ./src/utils/node-localstorage-polyfill.cjs --import tsx scripts/seedThemes.ts)
 */

import dotenv from 'dotenv';
import { getPageDbConnection, closeAllConnections } from '@/utils/db';
import { seedSystemThemes } from '@/lib/theme/seed';

dotenv.config();

async function main() {
  const pageDb = await getPageDbConnection();
  await seedSystemThemes(pageDb);
  console.log('✅ System themes seeded into the page DB.');
}

main()
  .catch((err) => {
    console.error('❌ Failed to seed system themes:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeAllConnections();
  });
