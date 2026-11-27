import fs from 'fs/promises';
import path from 'path';
import { THEMES_ROOT } from './config';

/** Optional client scripts that must load before assets/theme.js (same-origin only). */
const COMPANION_ASSETS = [
  'assets/three.min.js',
  'assets/gsap.min.js',
  'assets/ScrollTrigger.min.js',
] as const;

export async function resolveCompanionScriptUrls(
  slug: string,
  scriptUrl: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const rel of COMPANION_ASSETS) {
    const abs = path.join(/*turbopackIgnore: true*/ THEMES_ROOT, slug, rel);
    try {
      await fs.access(abs);
    } catch {
      continue;
    }
    const companion = scriptUrl.replace(/assets\/theme\.js(\?.*)?$/, `${rel}$1`);
    urls.push(companion);
  }

  return urls;
}
