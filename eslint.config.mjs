import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      // User-uploaded plugin packages (CommonJS backend + static frontend).
      // Avoid bracket globs like [pluginId] — they are treated as character classes.
      'src/plugins/**',
      'src/app/api/plugins/**/api/**',
      'src/app/api/plugins/**/server/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // CMS renders user-supplied images of arbitrary dimensions; next/image's
      // required width/height don't fit, so plain <img> is intentional here.
      '@next/next/no-img-element': 'off',
    },
  },
];

export default eslintConfig;
