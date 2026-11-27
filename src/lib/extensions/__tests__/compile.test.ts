import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileExtensionEntries,
  isTypeScriptFile,
  rewriteExtensionManifest,
  toCompiledJsPath,
} from '@/lib/extensions/compile';
import { enableExtension, installStagedExtension, uploadExtensionPackage } from '@/lib/extensions/lifecycle';
import {
  baseManifest,
  cleanup,
  makeServices,
  packageFiles,
  tempDir,
  zipOf,
} from '@/lib/extensions/__tests__/helpers';
import { validateExtensionPackage } from '@/lib/extensions/validate';
import { limits } from '@/lib/extensions/__tests__/helpers';

test('TypeScript path helpers rewrite entries to .js', () => {
  assert.equal(isTypeScriptFile('server/index.ts'), true);
  assert.equal(isTypeScriptFile('server/index.d.ts'), false);
  assert.equal(toCompiledJsPath('server/index.tsx'), 'server/index.js');
  const rewritten = rewriteExtensionManifest(
    baseManifest({
      entry: { frontend: 'ui/pages/app.ts', backend: 'server/index.ts' },
      contributions: {
        pages: [{ id: 'notes', title: 'Notes', entry: 'ui/pages/app.tsx' }],
        navigation: [{ id: 'notes', label: 'Notes', href: 'ui/pages/app.ts' }],
      },
    }) as never
  );
  assert.equal(rewritten.entry?.backend, 'server/index.js');
  assert.equal(rewritten.entry?.frontend, 'ui/pages/app.js');
  assert.equal(rewritten.contributions?.pages?.[0]?.entry, 'ui/pages/app.js');
});

test('compileExtensionEntries emits CommonJS for server TypeScript', () => {
  const manifest = baseManifest({
    entry: { frontend: 'ui/pages/index.html', backend: 'server/index.ts' },
  }) as never;
  const entries = new Map<string, Buffer>([
    ['manifest.json', Buffer.from(JSON.stringify(manifest))],
    ['ui/pages/index.html', Buffer.from('<h1>Notes</h1>')],
    [
      'server/index.ts',
      Buffer.from(`
        export async function register(context: { logger: { info: (m: string) => void } }) {
          context.logger.info('hi');
        }
      `),
    ],
  ]);
  const compiled = compileExtensionEntries(entries, manifest);
  assert.ok(compiled.entries.has('server/index.js'));
  const js = compiled.entries.get('server/index.js')!.toString('utf8');
  assert.match(js, /exports\.register|Object\.defineProperty\(exports/);
  assert.equal(compiled.manifest.entry?.backend, 'server/index.js');
  const storedManifest = JSON.parse(compiled.entries.get('manifest.json')!.toString('utf8'));
  assert.equal(storedManifest.entry.backend, 'server/index.js');
});

test('validation accepts TypeScript backend entries', async () => {
  const root = await tempDir();
  const services = makeServices(root);
  try {
    const manifest = baseManifest({
      entry: { frontend: 'ui/pages/index.html', backend: 'server/index.ts' },
      capabilities: ['navigation.register', 'ui.page.register', 'lifecycle.register'],
    });
    const result = await validateExtensionPackage(
      await zipOf(
        packageFiles(manifest, {
          'server/index.ts': 'export async function register() {}',
        })
      ),
      {
        limits,
        cmsVersion: '0.1.0',
        mode: 'install',
        resolveTarget: services.resolveTarget,
        listExtensions: () => services.repo.list(),
      }
    );
    assert.equal(result.installable, true);
    assert.equal(result.errors.length, 0);
  } finally {
    await cleanup(root);
  }
});

test('install compiles TypeScript and stores rewritten backend entry', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    const manifest = baseManifest({
      entry: { frontend: 'ui/pages/index.html', backend: 'server/index.ts' },
      capabilities: ['navigation.register', 'ui.page.register', 'lifecycle.register'],
    });
    const uploaded = await uploadExtensionPackage(
      await zipOf(
        packageFiles(manifest, {
          'server/index.ts': `
            module.exports = {
              async register(context) {
                context.logger.info('from-ts');
              }
            };
          `,
        })
      ),
      services
    );
    assert.ok(uploaded.stagingId);
    const installed = await installStagedExtension(uploaded.stagingId!, services);
    assert.equal(installed.extension.manifest.entry?.backend, 'server/index.js');
    const onDisk = await services.storage.readManifest('sample-notes', '1.0.0');
    assert.equal((onDisk as { entry?: { backend?: string } }).entry?.backend, 'server/index.js');
    const absolute = services.storage.resolvePackageFile('sample-notes', '1.0.0', 'server/index.js');
    const fs = await import('node:fs/promises');
    const body = await fs.readFile(absolute, 'utf8');
    assert.match(body, /from-ts|register/);

    let executed = false;
    services.executeBackend = async () => {
      executed = true;
    };
    await services.repo.upsert({
      ...installed.extension,
      trustedExecution: 'approved',
    });
    const enabled = await enableExtension('sample-notes', services);
    assert.equal(enabled.status, 'enabled');
    assert.equal(executed, true);
  } finally {
    await cleanup(root);
  }
});
