import test from 'node:test';
import assert from 'node:assert/strict';
import { manifestParser, normalizeManifestBlocks, normalizeManifestAuthor, normalizeCompatibleCmsVersion } from '@/modules/themeEngine/ManifestParser';
import semver from 'semver';

const baseManifest = {
  name: 'Test Theme',
  slug: 'test-theme',
  author: 'Author',
  version: '1.0.0',
  compatibleCmsVersion: '^2.0.0',
  entry: 'theme.ts',
};

test('normalizeManifestBlocks — object map with string paths', () => {
  const blocks = normalizeManifestBlocks({
    hero: 'blocks/Hero.tsx',
    'product-grid': 'blocks/ProductGrid.tsx',
  });
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], { type: 'hero', rendererPath: 'blocks/Hero.tsx' });
  assert.deepEqual(blocks[1], { type: 'product-grid', rendererPath: 'blocks/ProductGrid.tsx' });
});

test('normalizeManifestBlocks — object map with rich entries', () => {
  const blocks = normalizeManifestBlocks({
    hero: { name: 'Hero', file: 'blocks/Hero.tsx', schemaPath: 'blocks/Hero/schema.ts' },
  });
  assert.deepEqual(blocks[0], {
    type: 'hero',
    rendererPath: 'blocks/Hero.tsx',
    schemaPath: 'blocks/Hero/schema.ts',
  });
});

test('ManifestParser — accepts blocks as object map', () => {
  const { manifest } = manifestParser.parse({
    ...baseManifest,
    blocks: {
      hero: 'blocks/Hero.tsx',
      banner: 'blocks/Banner.tsx',
    },
  });
  assert.ok(manifest.blocks);
  assert.equal(manifest.blocks!.length, 2);
  assert.ok(manifest.blocks!.some((b) => b.type === 'hero'));
});

test('ManifestParser — accepts blocks as array (legacy)', () => {
  const { manifest } = manifestParser.parse({
    ...baseManifest,
    blocks: [{ type: 'hero', rendererPath: 'blocks/Hero/Renderer.tsx' }],
  });
  assert.equal(manifest.blocks!.length, 1);
  assert.equal(manifest.blocks![0].type, 'hero');
});

test('normalizeManifestAuthor — object with name', () => {
  assert.equal(
    normalizeManifestAuthor({ name: 'Theme Author', url: 'https://example.com' }),
    'Theme Author'
  );
});

test('ManifestParser — accepts author as object', () => {
  const { manifest } = manifestParser.parse({
    ...baseManifest,
    author: { name: 'Acme Themes', url: 'https://acme.example' },
  });
  assert.equal(manifest.author, 'Acme Themes');
});

test('ManifestParser — accepts author as string', () => {
  const { manifest } = manifestParser.parse({
    ...baseManifest,
    author: 'Plain String Author',
  });
  assert.equal(manifest.author, 'Plain String Author');
});

test('ManifestParser — multi-template without index derives index from home', () => {
  const { manifest } = manifestParser.parse({
    name: 'Modern Store',
    slug: 'modern-store',
    author: { name: 'Author' },
    version: '1.0.0',
    compatibleCmsVersion: '^2.0.0',
    templates: {
      home: { name: 'Home', file: 'templates/Home.tsx', type: 'home' },
      about: { name: 'About', file: 'templates/About.tsx', type: 'page' },
    },
  });
  assert.equal(manifest.templates.home, 'templates/Home.tsx');
  assert.equal(manifest.templates.index, 'templates/Home.tsx');
});

test('ManifestParser — templates omitted when theme.ts will register on disk', () => {
  const { manifest } = manifestParser.parse({
    name: 'TS Theme',
    slug: 'ts-theme',
    author: 'Author',
    version: '1.0.0',
    compatibleCmsVersion: '^2.0.0',
  });
  assert.ok(manifest);
});

test('normalizeCompatibleCmsVersion — bare semver becomes minimum version', () => {
  assert.equal(normalizeCompatibleCmsVersion('1.0.0'), '>=1.0.0');
  assert.ok(semver.satisfies('2.0.0', normalizeCompatibleCmsVersion('1.0.0')));
});

test('ManifestParser — accepts bare compatibleCmsVersion "1.0.0" for CMS 2.x', () => {
  const { manifest } = manifestParser.parse({
    ...baseManifest,
    compatibleCmsVersion: '1.0.0',
  });
  assert.equal(manifest.compatibleCmsVersion, '>=1.0.0');
  assert.ok(semver.satisfies('2.0.0', manifest.compatibleCmsVersion));
});
