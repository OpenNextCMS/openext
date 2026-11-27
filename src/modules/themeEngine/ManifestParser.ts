import { z, type ZodIssue } from 'zod';
import semver from 'semver';
import { ManifestValidationError } from './errors';
import type { ManifestIssue, ManifestParseResult, ThemeManifest, ThemeManifestBlock, ThemeTemplateMeta, ThemeTemplateType } from './types';
import { humanizeKey, inferType } from './templateMetadata';

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
  'screenshot',
  'defaults',
  'supports',
  'settings',
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

/** Rich template entry in theme.json (WordPress/Shopify-style). */
const templateMetaSchema = z.object({
  name: z.string().min(1),
  file: tsxPath,
  type: z
    .enum(['home', 'page', 'single', 'archive', 'search', 'error', 'custom'])
    .optional(),
});

const templateEntrySchema = z.union([tsxPath, templateMetaSchema]);

/** Extract a `.tsx` path from a string or rich template entry. */
export function resolveTemplateEntryPath(entry: unknown): string | null {
  if (typeof entry === 'string' && entry.trim()) return entry.trim();
  if (entry && typeof entry === 'object' && 'file' in entry) {
    const file = (entry as { file?: unknown }).file;
    if (typeof file === 'string' && file.trim()) return file.trim();
  }
  return null;
}

/** Ensure `templates.index` exists — derive from `home` or the first declared template. */
export function ensureIndexTemplate(templates: ThemeManifest['templates']): void {
  if (resolveTemplateEntryPath(templates.index)) return;
  if (templates.home) {
    templates.index = templates.home;
    return;
  }
  for (const [key, value] of Object.entries(templates)) {
    if (key === 'index') continue;
    if (typeof value === 'string' && value.trim()) {
      templates.index = value;
      return;
    }
  }
}

function hasDeclaredTemplates(templates: Record<string, unknown> | undefined): boolean {
  if (!templates) return false;
  return Object.values(templates).some((entry) => resolveTemplateEntryPath(entry) !== null);
}

/**
 * `templates` — `index` is mandatory (or supplied via `entry` + theme.ts);
 * values may be a path string or `{ name, file, type }` object.
 */
const templatesSchema = z
  .object({ index: templateEntrySchema.optional() })
  .catchall(templateEntrySchema.optional());

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

/** Rich block entry in theme.json object map: `{ "hero": { "file": "blocks/Hero.tsx" } }`. */
const blockRichSchema = z
  .object({
    name: z.string().optional(),
    file: tsxPath.optional(),
    rendererPath: tsxPath.optional(),
    schemaPath: tsPath.optional(),
    type: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.file && !value.rendererPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'must include "file" or "rendererPath"',
      });
    }
  });

/** Blocks may be an array OR an object map (same ergonomics as `partials`). */
const blocksMapSchema = z.record(
  z.string().min(1),
  z.union([tsxPath, blockRichSchema, blockSchema])
);

/** Normalize array or object-map blocks into the canonical array format. */
export function normalizeManifestBlocks(
  blocks: z.infer<typeof blockSchema>[] | z.infer<typeof blocksMapSchema>
): ThemeManifestBlock[] {
  if (Array.isArray(blocks)) return blocks;

  return Object.entries(blocks).map(([key, value]) => {
    if (typeof value === 'string') {
      return { type: key, rendererPath: value };
    }
    if ('type' in value && 'rendererPath' in value && typeof value.rendererPath === 'string') {
      return {
        type: value.type || key,
        rendererPath: value.rendererPath,
        schemaPath: value.schemaPath,
      };
    }
    const rich = value as z.infer<typeof blockRichSchema>;
    const rendererPath = rich.file ?? rich.rendererPath;
    return {
      type: rich.type ?? key,
      rendererPath: rendererPath as string,
      schemaPath: rich.schemaPath,
    };
  });
}

const blocksFieldSchema = z
  .union([z.array(blockSchema), blocksMapSchema])
  .optional()
  .transform((val) => (val === undefined ? undefined : normalizeManifestBlocks(val)));

/** Author may be a plain string or `{ name, url? }` (WordPress/Shopify-style manifest). */
const authorObjectSchema = z.object({
  name: z.string().min(1, 'name is required when author is an object'),
  url: z.string().optional(),
});

export function normalizeManifestAuthor(author: string | z.infer<typeof authorObjectSchema>): string {
  if (typeof author === 'string') return author.trim();
  return author.name.trim();
}

const authorFieldSchema = z
  .union([z.string().min(1, 'is required'), authorObjectSchema])
  .transform((val) => normalizeManifestAuthor(val));

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
    author: authorFieldSchema,
    version: z.string().superRefine((v, ctx) => {
      if (!semver.valid(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${v}" is not a valid semver version (e.g. 1.2.0)` });
      }
    }),
    description: z.string().max(500, 'must be at most 500 characters').optional(),
    compatibleCmsVersion: z.string().superRefine((v, ctx) => {
      if (!semver.valid(v.trim()) && !semver.validRange(v.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${v}" is not a valid semver version or range (e.g. 1.0.0 or ^2.0.0)`,
        });
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
    blocks: blocksFieldSchema,
    editableSections: z.array(editableSectionSchema).optional(),
    screenshot: z
      .string()
      .superRefine((value, ctx) => {
        const issue = pathIssues(value);
        if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
        else if (!/\.(png|jpe?g|webp|gif)$/i.test(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must end in .png, .jpg, .jpeg, .webp, or .gif' });
        }
      })
      .optional(),
    defaults: z.record(z.string(), z.string()).optional(),
    supports: z.record(z.string(), z.boolean()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  // Forward compatibility: unknown top-level keys are dropped, not rejected.
  .strip()
  .superRefine((data, ctx) => {
    const hasEntry = typeof data.entry === 'string' && data.entry.length > 0;
    const hasTemplates = hasDeclaredTemplates(data.templates as Record<string, unknown> | undefined);
    const templatesOmitted = data.templates === undefined;

    // Require entry, at least one declared template, OR omit templates (auto-discovered from disk).
    if (!hasEntry && !hasTemplates && !templatesOmitted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templates'],
        message:
          'must declare at least one template (e.g. home, page, index), provide entry (theme.ts), or omit templates to auto-discover from templates/*.tsx on disk.',
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

/** Bare semver (e.g. "1.0.0") means minimum CMS version; ranges are used as-is. */
export function normalizeCompatibleCmsVersion(v: string): string {
  const trimmed = v.trim();
  if (semver.valid(trimmed)) return `>=${trimmed}`;
  return trimmed;
}

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

    const templates: ThemeManifest['templates'] = { index: '' };
    const templateRegistry: ThemeTemplateMeta[] = [];

    const addTemplate = (key: string, entry: unknown) => {
      if (typeof entry === 'string') {
        templates[key] = entry;
        templateRegistry.push({
          key,
          name: humanizeKey(key),
          file: entry,
          type: inferType(key),
        });
      } else if (entry && typeof entry === 'object' && 'file' in entry) {
        const meta = entry as z.infer<typeof templateMetaSchema>;
        templates[key] = meta.file;
        templateRegistry.push({
          key,
          name: meta.name,
          file: meta.file,
          type: inferType(key, meta.type as ThemeTemplateType | undefined),
        });
      }
    };

    if (parsed.templates) {
      for (const [key, value] of Object.entries(parsed.templates)) {
        if (value === undefined) continue;
        addTemplate(key, value);
      }
    }
    ensureIndexTemplate(templates);

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
      compatibleCmsVersion: normalizeCompatibleCmsVersion(parsed.compatibleCmsVersion),
      ...(parsed.entry ? { entry: parsed.entry } : {}),
      templates,
      partials: parsed.partials ?? {},
      menus: parsed.menus ?? [],
      widgetAreas: parsed.widgetAreas ?? [],
      themeSettings: (parsed.themeSettings ?? []) as ThemeManifest['themeSettings'],
      supportedFeatures: parsed.supportedFeatures ?? [],
      ...(parsed.blocks ? { blocks: parsed.blocks } : {}),
      ...(parsed.editableSections ? { editableSections: parsed.editableSections } : {}),
      ...(templateRegistry.length > 0 ? { templateRegistry } : {}),
      ...(parsed.screenshot ? { screenshot: parsed.screenshot } : {}),
      ...(parsed.defaults ? { defaults: parsed.defaults } : {}),
      ...(parsed.supports ? { supports: parsed.supports } : {}),
      ...(parsed.settings ? { settings: parsed.settings } : {}),
    };

    return { manifest, warnings };
  }
}

/** Convenience singleton — the parser is stateless and pure. */
export const manifestParser = new ManifestParser();
