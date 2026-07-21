import { z, type ZodIssue } from 'zod';
import semver from 'semver';
import { ManifestValidationError } from './errors';
import type { ManifestIssue, ManifestParseResult, ThemeManifest } from './types';

/**
 * §4.1 ManifestParser — turn raw `theme.json` bytes (already JSON-parsed into a
 * JS value) into a typed, validated `ThemeManifest`.
 *
 * Hard constraints from the spec:
 *  - PURE: never touches the filesystem or the database. It only reasons about
 *    the shape of an object. Path fields are validated *lexically* here so that
 *    directory traversal is rejected BEFORE any module touches the disk.
 *  - Reports EVERY failing field in one pass (Zod collects all issues; we do not
 *    short-circuit and we never use `.parse()`'s throw-on-first behaviour).
 *  - Unknown top-level keys are STRIPPED (forward compatibility), and each one is
 *    surfaced as a warning so `installLog` can record it.
 */

/** Top-level keys this CMS version understands; anything else is stripped + warned. */
const KNOWN_TOP_LEVEL_KEYS = new Set([
  'name',
  'slug',
  'author',
  'version',
  'description',
  'compatibleCmsVersion',
  'entry',
  'templates',
  'partials',
  'menus',
  'widgetAreas',
  'themeSettings',
  'supportedFeatures',
  'blocks',
  'editableSections',
]);

const SECTION_ID_RE = /^[a-z][a-z0-9-]{1,63}$/;

const NAME_RE = /^[A-Za-z0-9 _-]{3,50}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Lexical safety for every declared path (spec §2).
 * A path must be RELATIVE, contain no `..` segment, no absolute/drive prefix,
 * no NUL byte, and no backslashes (normalize to posix at the schema boundary).
 */
function pathIssues(value: string): string | null {
  if (value.trim() === '') return 'must not be empty';
  if (value.includes('\0')) return 'must not contain NUL bytes';
  if (value.includes('\\')) return 'must use forward slashes (posix), not backslashes';
  if (value.startsWith('/')) return 'must be a relative path (leading "/" is not allowed)';
  if (/^[A-Za-z]:/.test(value)) return 'must be a relative path (drive letters are not allowed)';
  const segments = value.split('/');
  if (segments.some((s) => s === '..')) return 'must not contain ".." path segments';
  if (segments.some((s) => s === '')) return 'must not contain empty path segments';
  return null;
}

/** A relative component path that must end in `.tsx`. */
const tsxPath = z
  .string()
  .superRefine((value, ctx) => {
    const issue = pathIssues(value);
    if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    else if (!value.endsWith('.tsx')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must end in ".tsx"' });
    }
  });

/** A relative schema path that must end in `.ts`. */
const tsPath = z
  .string()
  .superRefine((value, ctx) => {
    const issue = pathIssues(value);
    if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    else if (!value.endsWith('.ts')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must end in ".ts"' });
    }
  });

/**
 * `templates` — `index` is mandatory; every other entry is a theme-defined named
 * template. `catchall` applies the same `.tsx` + traversal rules to custom keys.
 */
const templatesSchema = z
  .object({ index: tsxPath.optional() })
  .catchall(tsxPath.optional());

const partialsSchema = z
  .object({
    header: tsxPath.optional(),
    footer: tsxPath.optional(),
    sidebar: tsxPath.optional(),
  })
  .strip();

const menuSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  maxDepth: z.number().int().positive().optional(),
});

const widgetAreaSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  allowedBlockTypes: z.array(z.string().min(1)).optional(),
});

/** `select` requires a non-empty `options` array (spec §2). */
const themeSettingSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['text', 'color', 'select', 'boolean', 'image', 'number']),
    default: z.unknown(),
    options: z.array(z.string()).optional(),
  })
  .superRefine((setting, ctx) => {
    if (setting.type === 'select' && (!setting.options || setting.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'is required and must be non-empty when type is "select"',
      });
    }
  });

const blockSchema = z.object({
  type: z.string().min(1),
  rendererPath: tsxPath,
  schemaPath: tsPath.optional(),
});

const editableSectionSchema = z.object({
  id: z
    .string()
    .regex(SECTION_ID_RE, 'must be kebab-case starting with a letter (2-64 chars)'),
  label: z.string().min(1).max(80),
  blockType: z.string().min(1),
  defaults: z.record(z.string(), z.unknown()).optional(),
  hiddenByDefault: z.boolean().optional(),
});

const manifestSchema = z
  .object({
    name: z.string().regex(NAME_RE, 'must be 3-50 chars of letters, numbers, spaces, "_" or "-"'),
    slug: z
      .string()
      .regex(SLUG_RE, 'must be kebab-case (lowercase letters, numbers and single hyphens)')
      .optional(),
    author: z.string().min(1, 'is required'),
    version: z.string().superRefine((v, ctx) => {
      if (!semver.valid(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${v}" is not a valid semver version (e.g. 1.2.0)` });
      }
    }),
    description: z.string().max(500, 'must be at most 500 characters').optional(),
    compatibleCmsVersion: z.string().superRefine((v, ctx) => {
      if (!semver.validRange(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${v}" is not a valid semver range (e.g. ^2.0.0)` });
      }
    }),
    entry: z
      .string()
      .superRefine((value, ctx) => {
        const issue = pathIssues(value);
        if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
        else if (!value.endsWith('.ts')) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must end in ".ts"' });
        }
      })
      .optional(),
    templates: templatesSchema.optional(),
    partials: partialsSchema.optional(),
    menus: z.array(menuSchema).optional(),
    widgetAreas: z.array(widgetAreaSchema).optional(),
    themeSettings: z.array(themeSettingSchema).optional(),
    supportedFeatures: z
      .array(z.enum(['dark-mode', 'rtl', 'custom-logo', 'post-thumbnails', 'widgets', 'menus', 'block-editor']))
      .optional(),
    blocks: z.array(blockSchema).optional(),
    editableSections: z.array(editableSectionSchema).optional(),
  })
  // Forward compatibility: unknown top-level keys are dropped, not rejected.
  .strip()
  .superRefine((data, ctx) => {
    const hasEntry = typeof data.entry === 'string' && data.entry.length > 0;
    const hasIndex = typeof data.templates?.index === 'string';
    if (!hasEntry && !hasIndex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templates', 'index'],
        message: 'is required when "entry" is not declared — provide templates.index or entry (e.g. theme.ts).',
      });
    }

    const sections = data.editableSections ?? [];
    if (sections.length === 0) return;

    const blockTypes = new Set((data.blocks ?? []).map((b) => b.type));
    const seenIds = new Set<string>();
    const deferBlockCheck = hasEntry;

    sections.forEach((section, i) => {
      if (seenIds.has(section.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['editableSections', i, 'id'],
          message: `duplicate section id "${section.id}"`,
        });
      }
      seenIds.add(section.id);

      if (!deferBlockCheck && !blockTypes.has(section.blockType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['editableSections', i, 'blockType'],
          message: `references unknown block type "${section.blockType}" — declare it under "blocks" first`,
        });
      }
    });
  });

/** Derive a kebab-case slug from the theme name (spec §1.1 / §2). */
export function deriveSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Render a Zod path array into a dotted/bracketed string for ManifestIssue.path. */
function formatPath(path: (string | number)[]): string {
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`;
    return acc ? `${acc}.${seg}` : String(seg);
  }, '');
}

export class ManifestParser {
  /**
   * Validate + normalize a raw manifest value.
   *
   * @throws {ManifestValidationError} with EVERY failing field collected in one pass.
   */
  parse(raw: unknown): ManifestParseResult {
    const warnings: string[] = [];

    // Guard the container shape ourselves so we can emit a precise root issue
    // rather than a generic Zod "Expected object, received null".
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new ManifestValidationError([
        { path: '', message: 'theme.json must be a JSON object.' },
      ]);
    }

    // Warn (do not fail) about unknown top-level keys — they are stripped below.
    for (const key of Object.keys(raw as Record<string, unknown>)) {
      if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
        warnings.push(`Unknown top-level key "${key}" was ignored (not supported by this CMS version).`);
      }
    }

    // `safeParse` so Zod collects ALL issues instead of throwing on the first.
    const result = manifestSchema.safeParse(raw);
    if (!result.success) {
      const issues: ManifestIssue[] = result.error.issues.map((issue: ZodIssue) => ({
        path: formatPath(issue.path),
        message: issue.message,
      }));
      throw new ManifestValidationError(issues);
    }

    const parsed = result.data;

    const templates: ThemeManifest['templates'] = { index: parsed.templates?.index ?? '' };
    if (parsed.templates) {
      for (const [key, value] of Object.entries(parsed.templates)) {
        if (key === 'index') continue;
        if (typeof value === 'string') templates[key] = value;
      }
    }

    const slug = parsed.slug ?? deriveSlug(parsed.name);
    // deriveSlug can produce an empty string for pathological names (e.g. "___"),
    // which NAME_RE would otherwise allow through.
    if (!SLUG_RE.test(slug)) {
      throw new ManifestValidationError([
        {
          path: parsed.slug ? 'slug' : 'name',
          message: parsed.slug
            ? 'must be kebab-case (lowercase letters, numbers and single hyphens)'
            : `could not derive a valid slug from name "${parsed.name}" — provide an explicit "slug".`,
        },
      ]);
    }

    const manifest: ThemeManifest = {
      name: parsed.name,
      slug,
      author: parsed.author,
      version: parsed.version,
      description: parsed.description,
      compatibleCmsVersion: parsed.compatibleCmsVersion,
      ...(parsed.entry ? { entry: parsed.entry } : {}),
      templates,
      partials: parsed.partials ?? {},
      menus: parsed.menus ?? [],
      widgetAreas: parsed.widgetAreas ?? [],
      themeSettings: (parsed.themeSettings ?? []) as ThemeManifest['themeSettings'],
      supportedFeatures: parsed.supportedFeatures ?? [],
      ...(parsed.blocks ? { blocks: parsed.blocks } : {}),
      ...(parsed.editableSections ? { editableSections: parsed.editableSections } : {}),
    };

    return { manifest, warnings };
  }
}

/** Convenience singleton — the parser is stateless and pure. */
export const manifestParser = new ManifestParser();
