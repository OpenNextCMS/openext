import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { extractPluginZip } from '../src/lib/plugins/extract';
import { getPluginDirectory } from '../src/lib/plugins/storage';

const manifest = {
  id: 'hello-block',
  name: 'Hello Block',
  version: '1.0.0',
  description: 'Sample uploaded plugin',
  author: 'Test',
  type: 'block',
  icon: '👋',
  entryPoint: 'index.js',
  styles: ['styles.css'],
  customElement: 'hello-block',
};

async function createSampleZip(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('index.js', "console.log('hello plugin');");
  zip.file('styles.css', '.hello-plugin { color: blue; }');
  return zip.generateAsync({ type: 'arraybuffer' });
}

async function main() {
  const zipBuffer = await createSampleZip();
  const result = await extractPluginZip(zipBuffer);
  const pluginDir = getPluginDirectory(result.manifest.pluginId);
  const files = await fs.readdir(pluginDir);
  console.log('Extracted to:', pluginDir);
  console.log('Files:', files);
  console.log('Result:', result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
