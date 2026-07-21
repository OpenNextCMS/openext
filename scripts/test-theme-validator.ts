import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ThemeValidator } from '../src/modules/themeEngine/ThemeValidator';

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const VALID_TSX = `export default function Index() {\n  return null;\n}\n`;
const HOME_TSX = `import React from 'react';\n\nexport default function Home() {\n  return React.createElement('div', null, 'home');\n}\n`;
const HEADER_TSX = `export default function Header() {\n  return null;\n}\n`;
const BROKEN_TSX_NO_DEFAULT_EXPORT = `export function HeroRenderer() {\n  return null;\n}\n`;
const HERO_SCHEMA_TS = `export const schema = { title: 'string' };\n`;

function manifestJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify(
    {
      name: 'Fixture Theme',
      author: 'Test Suite',
      version: '1.0.0',
      compatibleCmsVersion: '^2.0.0',
      templates: { index: 'templates/Index.tsx', home: 'templates/Home.tsx' },
      partials: { header: 'partials/Header.tsx' },
      blocks: [{ type: 'hero', rendererPath: 'blocks/Hero/Renderer.tsx', schemaPath: 'blocks/Hero/schema.ts' }],
      ...overrides,
    },
    null,
    2
  );
}

async function write(root: string, rel: string, content: string) {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

async function buildValidFixture(root: string) {
  await fs.rm(root, { recursive: true, force: true });
  await write(root, 'theme.json', manifestJson());
  await write(root, 'templates/Index.tsx', VALID_TSX);
  await write(root, 'templates/Home.tsx', HOME_TSX);
  await write(root, 'partials/Header.tsx', HEADER_TSX);
  await write(root, 'blocks/Hero/Renderer.tsx', VALID_TSX);
  await write(root, 'blocks/Hero/schema.ts', HERO_SCHEMA_TS);
}

async function freshRoot(name: string): Promise<string> {
  const root = path.join(os.tmpdir(), 'theme-engine-fixtures', name);
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });
  return root;
}

async function main() {
  const validator = new ThemeValidator();

  // 1. Fully valid fixture — everything should pass, no false positives.
  {
    console.log('1. valid fixture');
    const root = await freshRoot('valid');
    await buildValidFixture(root);
    const result = await validator.validate(root);
    check('valid === true', result.valid === true, JSON.stringify(result.errors));
    check('no errors', result.errors.length === 0, JSON.stringify(result.errors));
    check('manifest returned', result.manifest?.slug === 'fixture-theme');
  }

  // 2. One .tsx with no default export — exactly COMPONENT_NO_DEFAULT_EXPORT, nothing else wrong.
  {
    console.log('2. broken component (no default export)');
    const root = await freshRoot('broken-component');
    await buildValidFixture(root);
    await write(root, 'blocks/Hero/Renderer.tsx', BROKEN_TSX_NO_DEFAULT_EXPORT);
    const result = await validator.validate(root);
    check('valid === false', result.valid === false);
    check('exactly one error', result.errors.length === 1, JSON.stringify(result.errors));
    check(
      'error code is COMPONENT_NO_DEFAULT_EXPORT on the broken file',
      result.errors[0]?.code === 'COMPONENT_NO_DEFAULT_EXPORT' && result.errors[0]?.file === 'blocks/Hero/Renderer.tsx',
      JSON.stringify(result.errors)
    );
  }

  // 3. Disallowed extension present in the package.
  {
    console.log('3. disallowed extension (.txt)');
    const root = await freshRoot('disallowed-ext');
    await buildValidFixture(root);
    await write(root, 'templates/notes.txt', 'not allowed here');
    const result = await validator.validate(root);
    check('valid === false', result.valid === false);
    check(
      'DISALLOWED_EXTENSION reported for notes.txt',
      result.errors.some((e) => e.code === 'DISALLOWED_EXTENSION' && e.file === 'templates/notes.txt'),
      JSON.stringify(result.errors)
    );
  }

  // 4. Manifest declares a template that doesn't exist on disk.
  {
    console.log('4. declared file missing on disk');
    const root = await freshRoot('missing-declared-file');
    await fs.rm(root, { recursive: true, force: true });
    await write(root, 'theme.json', manifestJson({ templates: { index: 'templates/Index.tsx', archive: 'templates/Archive.tsx' } }));
    await write(root, 'templates/Index.tsx', VALID_TSX);
    await write(root, 'blocks/Hero/Renderer.tsx', VALID_TSX);
    await write(root, 'blocks/Hero/schema.ts', HERO_SCHEMA_TS);
    const result = await validator.validate(root);
    check('valid === false', result.valid === false);
    check(
      'DECLARED_FILE_MISSING reported for templates.archive',
      result.errors.some((e) => e.code === 'DECLARED_FILE_MISSING' && e.file === 'templates/Archive.tsx'),
      JSON.stringify(result.errors)
    );
  }

  // 5. theme.json missing entirely.
  {
    console.log('5. manifest missing');
    const root = await freshRoot('manifest-missing');
    await fs.rm(root, { recursive: true, force: true });
    await write(root, 'templates/Index.tsx', VALID_TSX);
    const result = await validator.validate(root);
    check('valid === false', result.valid === false);
    check(
      'MANIFEST_MISSING reported',
      result.errors.some((e) => e.code === 'MANIFEST_MISSING'),
      JSON.stringify(result.errors)
    );
  }

  // 6. Incompatible CMS version range.
  {
    console.log('6. CMS version incompatible');
    const root = await freshRoot('cms-incompatible');
    await buildValidFixture(root);
    await write(root, 'theme.json', manifestJson({ compatibleCmsVersion: '^99.0.0' }));
    const result = await validator.validate(root);
    check('valid === false', result.valid === false);
    check(
      'CMS_INCOMPATIBLE reported',
      result.errors.some((e) => e.code === 'CMS_INCOMPATIBLE'),
      JSON.stringify(result.errors)
    );
  }

  // 7. Directory traversal via a symlink pointing outside the package root.
  {
    console.log('7. symlink escaping the package root');
    const root = await freshRoot('symlink-escape');
    await buildValidFixture(root);
    const outsideTarget = path.join(os.tmpdir(), 'theme-engine-fixtures', 'outside-target.txt');
    await fs.writeFile(outsideTarget, 'outside', 'utf8');
    await fs.mkdir(path.join(root, 'assets'), { recursive: true });
    let symlinkOk = true;
    try {
      await fs.symlink(outsideTarget, path.join(root, 'assets', 'escape.txt'));
    } catch (err) {
      symlinkOk = false;
      console.log(`  (skipped: could not create symlink on this OS/permission set: ${String(err)})`);
    }
    if (symlinkOk) {
      const result = await validator.validate(root);
      check('valid === false', result.valid === false);
      check(
        'PATH_ESCAPE reported for the symlink',
        result.errors.some((e) => e.code === 'PATH_ESCAPE' && e.file === 'assets/escape.txt'),
        JSON.stringify(result.errors)
      );
    }
  }

  // 8. Total unpacked size exceeds a small test-supplied cap.
  {
    console.log('8. package too large (custom small cap)');
    const root = await freshRoot('too-large');
    await buildValidFixture(root);
    await write(root, 'assets/big.css', 'x'.repeat(200_000));
    const smallCapValidator = new ThemeValidator(undefined, { maxUnpackedBytes: 100_000 });
    const result = await smallCapValidator.validate(root);
    check('valid === false', result.valid === false);
    check(
      'PACKAGE_TOO_LARGE reported',
      result.errors.some((e) => e.code === 'PACKAGE_TOO_LARGE'),
      JSON.stringify(result.errors)
    );
  }

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
