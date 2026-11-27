import { callAI } from '@/lib/ai/provider';
import { getLanguageLabel, withLocalePrefix } from '@/lib/i18n/siteLanguages';

const SKIP_KEYS = new Set([
  'id',
  'uniqueId',
  '_id',
  'type',
  'tag',
  'className',
  'class',
  'href',
  'src',
  'url',
  'slug',
  'style',
  'styles',
  'attributes',
  'events',
  'icon',
  'iconName',
  'color',
  'background',
  'backgroundColor',
  'fontFamily',
  'fontSize',
  'width',
  'height',
  'locale',
  'translationGroupId',
  'pageType',
  'layout',
  'variant',
  'alignment',
  'position',
  'animation',
  'videoUrl',
  'imageUrl',
  'poster',
  'mimeType',
]);

function isTranslatableString(value: string, key: string): boolean {
  if (SKIP_KEYS.has(key)) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^\/[\w\-./]*$/.test(trimmed) && !/\s/.test(trimmed)) return false;
  if (/^#/.test(trimmed) && trimmed.length < 40) return false;
  if (/^[\d.\s%xpxrememvhvw-]+$/.test(trimmed)) return false;
  if (/^rgba?\(/.test(trimmed) || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return false;
  // Likely code / class soup
  if (!/[a-zA-Z\u00C0-\u024F\u0900-\u097F\u0600-\u06FF]/.test(trimmed)) return false;
  return true;
}

type PathRef = { path: Array<string | number>; value: string };

function collectStrings(node: unknown, path: Array<string | number>, out: PathRef[]): void {
  if (node == null) return;
  if (typeof node === 'string') {
    const key = typeof path[path.length - 1] === 'string' ? String(path[path.length - 1]) : 'text';
    if (isTranslatableString(node, key)) out.push({ path: [...path], value: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectStrings(item, [...path, i], out));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (SKIP_KEYS.has(k)) continue;
      collectStrings(v, [...path, k], out);
    }
  }
}

function setAtPath(root: unknown, path: Array<string | number>, value: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = root;
  for (let i = 0; i < path.length - 1; i++) {
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}

/**
 * Translate user-facing strings inside page component JSON via AI.
 * Falls back to the original component tree if AI is unavailable or fails.
 */
export async function translateComponentStrings(
  component: unknown[],
  targetLocale: string
): Promise<unknown[]> {
  const clone = structuredClone(component);
  const refs: PathRef[] = [];
  collectStrings(clone, [], refs);
  if (refs.length === 0) return clone;

  const langLabel = getLanguageLabel(targetLocale);
  const BATCH = 40;

  try {
    for (let i = 0; i < refs.length; i += BATCH) {
      const slice = refs.slice(i, i + BATCH);
      const payload = slice.map((r, idx) => ({ i: idx, text: r.value }));
      const raw = await callAI([
        {
          role: 'system',
          content:
            `You translate website UI copy into ${langLabel} (${targetLocale}). ` +
            'Return ONLY a JSON array of objects { "i": number, "text": string } with the same indices. ' +
            'Keep HTML tags, brand names, and placeholders intact. Do not add commentary.',
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ]);

      let parsed: { i: number; text: string }[] = [];
      try {
        const start = raw.indexOf('[');
        const end = raw.lastIndexOf(']');
        const json = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        parsed = JSON.parse(json);
      } catch {
        continue;
      }

      for (const item of parsed) {
        if (typeof item?.i !== 'number' || typeof item?.text !== 'string') continue;
        const ref = slice[item.i];
        if (ref) setAtPath(clone, ref.path, item.text);
      }
    }
    return clone;
  } catch (err) {
    console.warn('[translateComponentStrings] AI failed, keeping source text:', err);
    return clone;
  }
}

/** Prefix internal nav hrefs inside cloned header component JSON for a locale. */
export function prefixNavHrefsInComponents(
  component: unknown[],
  locale: string,
  defaultLocale: string
): unknown[] {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const obj = node as Record<string, unknown>;

    // nav-bar content.links[].href
    if (obj.type === 'nav-bar' && obj.content) {
      try {
        const content =
          typeof obj.content === 'string' ? JSON.parse(obj.content) : { ...(obj.content as object) };
        const links = Array.isArray((content as { links?: unknown }).links)
          ? (content as { links: Record<string, unknown>[] }).links
          : [];
        const nextLinks = links.map((link) => {
          const href = typeof link.href === 'string' ? link.href : '';
          if (!href || href.startsWith('#') || /^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
            return link;
          }
          const path = href.startsWith('/') ? href : `/${href}`;
          return { ...link, href: withLocalePrefix(path, locale, defaultLocale) };
        });
        return {
          ...obj,
          content:
            typeof obj.content === 'string'
              ? JSON.stringify({ ...content, links: nextLinks })
              : { ...content, links: nextLinks },
        };
      } catch {
        return obj;
      }
    }

    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) next[k] = walk(v);
    return next;
  };

  return walk(component) as unknown[];
}
