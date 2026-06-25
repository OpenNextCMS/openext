import { getDynamicEnv } from '@/utils/dynamicEnv';

/** Absolute site URL (no trailing slash) from env, used for canonical/OG/sitemap. */
export function getSiteUrl(): string {
  const env = getDynamicEnv();
  const raw =
    env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3011';
  return raw.replace(/\/$/, '');
}

/** Build an absolute URL for a path within the site. */
export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  return `${base}/${path.replace(/^\//, '')}`;
}
