import { ManifestParser } from '../src/modules/themeEngine/ManifestParser';
import { ManifestValidationError } from '../src/modules/themeEngine/errors';

const parser = new ManifestParser();

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1. Valid fixture — should parse clean, no warnings.
{
  const valid = {
    name: 'Sample Theme',
    author: 'Acme Co',
    version: '1.2.0',
    compatibleCmsVersion: '^2.0.0',
    templates: { index: 'templates/Index.tsx', home: 'templates/Home.tsx' },
    partials: { header: 'partials/Header.tsx', footer: 'partials/Footer.tsx' },
    menus: [{ key: 'primary', label: 'Primary' }],
    widgetAreas: [{ key: 'sidebar', label: 'Sidebar' }],
    themeSettings: [
      { key: 'accent', label: 'Accent Color', type: 'color', default: '#000000' },
      { key: 'layout', label: 'Layout', type: 'select', default: 'wide', options: ['wide', 'narrow'] },
    ],
    supportedFeatures: ['dark-mode', 'menus'],
    blocks: [{ type: 'hero', rendererPath: 'blocks/Hero/Renderer.tsx', schemaPath: 'blocks/Hero/schema.ts' }],
  };

  console.log('1. valid fixture');
  try {
    const { manifest, warnings } = parser.parse(valid);
    check('parses without throwing', true);
    check('slug derived when absent', manifest.slug === 'sample-theme', manifest.slug);
    check('templates.index preserved', manifest.templates.index === 'templates/Index.tsx');
    check('blocks[].schemaPath preserved', manifest.blocks?.[0]?.schemaPath === 'blocks/Hero/schema.ts');
    check('blocks[].schemaPath is optional (present here)', typeof manifest.blocks?.[0]?.schemaPath === 'string');
    check('no warnings for a fully-known manifest', warnings.length === 0, JSON.stringify(warnings));
  } catch (err) {
    check('parses without throwing', false, String(err));
  }

  // blocks[].schemaPath omitted entirely must still be valid (optional field).
  console.log('1b. valid fixture, blocks[].schemaPath omitted');
  try {
    const { manifest } = parser.parse({ ...valid, blocks: [{ type: 'hero', rendererPath: 'blocks/Hero/Renderer.tsx' }] });
    check('parses without throwing', true);
    check('schemaPath left undefined', manifest.blocks?.[0]?.schemaPath === undefined);
  } catch (err) {
    check('parses without throwing', false, String(err));
  }
}

const base = {
  name: 'Sample Theme',
  author: 'Acme Co',
  version: '1.2.0',
  compatibleCmsVersion: '^2.0.0',
  templates: { index: 'templates/Index.tsx' },
};

function expectIssuePath(label: string, raw: unknown, expectedPathFragment: string) {
  console.log(label);
  try {
    parser.parse(raw);
    check('throws ManifestValidationError', false, 'did not throw');
  } catch (err) {
    check('throws ManifestValidationError', err instanceof ManifestValidationError);
    if (err instanceof ManifestValidationError) {
      const hit = err.issues.some((i) => i.path.includes(expectedPathFragment));
      check(`issue path includes "${expectedPathFragment}"`, hit, JSON.stringify(err.issues));
    }
  }
}

// 2. Bad semver version.
expectIssuePath('2. bad semver version', { ...base, version: 'not-a-version' }, 'version');

// 3. Missing templates.index.
expectIssuePath('3. missing templates.index', { ...base, templates: { home: 'templates/Home.tsx' } }, 'templates.index');

// 4. ".." in a declared path (directory traversal).
expectIssuePath('4. ".." in a declared path', { ...base, templates: { index: '../evil/Index.tsx' } }, 'templates.index');

// 5. Non-.tsx template path.
expectIssuePath('5. non-.tsx template path', { ...base, templates: { index: 'templates/Index.jsx' } }, 'templates.index');

// 6. "select" theme setting with no options.
expectIssuePath(
  '6. select-type themeSetting with no options',
  { ...base, themeSettings: [{ key: 'layout', label: 'Layout', type: 'select', default: 'wide' }] },
  'themeSettings'
);

// 7. Unknown top-level key — should WARN, not throw, and be stripped.
{
  console.log('7. unknown top-level key (should warn + strip, not throw)');
  try {
    const { manifest, warnings } = parser.parse({ ...base, notARealField: 'oops' });
    check('parses without throwing', true);
    check('warning emitted', warnings.some((w) => w.includes('notARealField')), JSON.stringify(warnings));
    check('unknown key stripped from result', !('notARealField' in manifest));
  } catch (err) {
    check('parses without throwing', false, String(err));
  }
}

console.log('\n' + (failures === 0 ? `ALL CHECKS PASSED` : `${failures} CHECK(S) FAILED`));
process.exit(failures === 0 ? 0 : 1);
