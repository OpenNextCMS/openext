/**
 * Test notes plugin backend install outside Next.js bundler.
 * Run: npx tsx scripts/test-notes-plugin-install.ts
 */
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { extractPluginZip } from '../src/lib/plugins/extract';
import { installBackendPlugin } from '../src/lib/plugins/server/lifecycle';
import { getUserDbConnection } from '../src/utils/db';

async function zipNotesPlugin(): Promise<ArrayBuffer> {
  const root = path.join(process.cwd(), 'examples', 'notes-plugin');
  const zip = new JSZip();

  async function addDir(relativeDir: string) {
    const abs = path.join(root, relativeDir);
    const entries = await fs.readdir(abs, { withFileTypes: true });
    for (const entry of entries) {
      const rel = path.join(relativeDir, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        await addDir(rel);
      } else {
        const content = await fs.readFile(path.join(abs, entry.name));
        zip.file(rel, content);
      }
    }
  }

  await addDir('.');
  return zip.generateAsync({ type: 'arraybuffer' });
}

async function main() {
  console.log('Zipping notes-plugin...');
  const buffer = await zipNotesPlugin();

  console.log('Extracting...');
  const extracted = await extractPluginZip(buffer);
  console.log('Extracted:', extracted.manifest.pluginId, extracted.hasBackend, extracted.serverEntry);

  await getUserDbConnection();

  console.log('Installing backend...');
  const result = await installBackendPlugin({
    pluginId: extracted.manifest.pluginId,
    serverEntry: extracted.serverEntry!,
    migrations: extracted.migrations,
    permissions: extracted.permissions,
    installHook: extracted.installHook,
    uninstallHook: extracted.uninstallHook,
    dependencies: extracted.dependencies,
    enableAfterInstall: true,
  });

  console.log('Success:', result);
}

main().catch((error) => {
  console.error('FAILED:', error);
  process.exit(1);
});
