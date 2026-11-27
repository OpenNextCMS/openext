import test from 'node:test';
import assert from 'node:assert/strict';
import { templateHierarchy } from '@/modules/themeEngine/TemplateHierarchy';
import { resolvePageTemplateKey, pickExistingTemplate } from '@/modules/themeEngine/pageTemplateResolver';
import { extractTemplateMetadata, keyFromFilePath } from '@/modules/themeEngine/templateMetadata';
import type { ThemeManifest } from '@/modules/themeEngine/types';

const sampleManifest: ThemeManifest = {
  name: 'Modern Store',
  slug: 'modern-store',
  author: 'Author',
  version: '1.0.0',
  compatibleCmsVersion: '^2.0.0',
  templates: {
    index: 'templates/Index.tsx',
    home: 'templates/Home.tsx',
    about: 'templates/About.tsx',
    product: 'templates/Product.tsx',
    page: 'templates/Page.tsx',
  },
  partials: { header: 'partials/Header.tsx', footer: 'partials/Footer.tsx' },
  menus: [],
  widgetAreas: [],
  themeSettings: [],
  supportedFeatures: [],
};

test('TemplateHierarchy — home falls back to index', () => {
  const order = templateHierarchy.resolveOrder({ pageType: 'home' });
  assert.ok(order.includes('home'));
  assert.equal(order[order.length - 1], 'index');
});

test('TemplateHierarchy — custom template key is tried first', () => {
  const order = templateHierarchy.resolveOrder({ pageType: 'page', customTemplateKey: 'about' });
  assert.equal(order[0], 'about');
});

test('resolvePageTemplateKey — uses page-assigned template', () => {
  const key = resolvePageTemplateKey({
    page: { id: '1', slug: 'about-us', title: 'About', type: 'page', templateKey: 'about' },
    manifest: sampleManifest,
  });
  assert.equal(key, 'about');
});

test('resolvePageTemplateKey — homepage setting override', () => {
  const key = resolvePageTemplateKey({
    page: { id: '1', slug: 'home', title: 'Home', type: 'home' },
    manifest: sampleManifest,
    homepageTemplateKey: 'about',
  });
  assert.equal(key, 'about');
});

test('resolvePageTemplateKey — product content type default', () => {
  const key = resolvePageTemplateKey({
    page: { id: '1', slug: 'bike', title: 'Bike', type: 'product' },
    manifest: sampleManifest,
  });
  assert.equal(key, 'product');
});

test('pickExistingTemplate — skips missing templates', () => {
  assert.equal(pickExistingTemplate(sampleManifest, ['404', 'page', 'index']), 'page');
});

test('extractTemplateMetadata — builds registry from manifest', () => {
  const meta = extractTemplateMetadata(sampleManifest);
  assert.ok(meta.some((t) => t.key === 'home'));
  assert.ok(meta.some((t) => t.key === 'product'));
});

test('keyFromFilePath — BlogPost maps to blogPost', () => {
  assert.equal(keyFromFilePath('templates/BlogPost.tsx'), 'blogPost');
});

test('legacy Index-only theme — index used as fallback for home', () => {
  const legacy: ThemeManifest = {
    ...sampleManifest,
    templates: { index: 'templates/Index.tsx' },
  };
  const key = resolvePageTemplateKey({
    page: { id: '1', slug: 'home', title: 'Home', type: 'home' },
    manifest: legacy,
  });
  assert.equal(key, 'index');
});
