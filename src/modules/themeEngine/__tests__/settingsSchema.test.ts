import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenSettingsSchema, defaultsFromSettingsSchema } from '../settingsSchema';
import type { ThemeManifest } from '../types';

const baseManifest = (): ThemeManifest => ({
  name: 'Test',
  slug: 'test',
  author: 'Author',
  version: '1.0.0',
  compatibleCmsVersion: '>=1.0.0',
  templates: { index: 'templates/Index.tsx' },
  partials: {},
  menus: [],
  widgetAreas: [],
  themeSettings: [],
  supportedFeatures: [],
});

test('flattenSettingsSchema — object-style nested settings', () => {
  const manifest: ThemeManifest = {
    ...baseManifest(),
    settings: {
      colors: {
        primary: { type: 'color', default: '#111111' },
        accent: { type: 'color', default: '#DFE104' },
      },
      layout: {
        maxWidth: { type: 'number', default: 1400 },
      },
    },
  };
  const fields = flattenSettingsSchema(manifest);
  assert.equal(fields.length, 3);
  assert.ok(fields.some((f) => f.key === 'colors.primary'));
  assert.ok(fields.some((f) => f.key === 'layout.maxWidth'));
});

test('defaultsFromSettingsSchema — merges object defaults', () => {
  const manifest: ThemeManifest = {
    ...baseManifest(),
    settings: {
      colors: {
        primary: { type: 'color', default: '#000' },
      },
    },
  };
  const defaults = defaultsFromSettingsSchema(manifest);
  assert.equal(defaults['colors.primary'], '#000');
});
