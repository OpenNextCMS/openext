import {
  SOCIAL_PLATFORM_LABELS,
} from './constants';
import type {
  ISocialMediaSettings,
  SocialPlatformId,
  SocialShareUrlItem,
} from '@/types/social-media';

function encode(value: string): string {
  return encodeURIComponent(value);
}

/** Build native share intent URLs for supported platforms. */
export function buildShareUrls(opts: {
  url: string;
  title?: string;
  message?: string;
  platforms?: SocialPlatformId[];
  settings?: ISocialMediaSettings | null;
}): SocialShareUrlItem[] {
  const pageUrl = (opts.url || '').trim();
  if (!pageUrl) return [];

  const title = (opts.title || '').trim();
  const message = (opts.message || title || '').trim();
  const text = message ? `${message} ${pageUrl}`.trim() : pageUrl;

  const wanted = opts.platforms?.length
    ? opts.platforms
    : (Object.keys(SOCIAL_PLATFORM_LABELS) as SocialPlatformId[]);

  const items: SocialShareUrlItem[] = [];

  for (const platform of wanted) {
    if (opts.settings) {
      const cfg = opts.settings.platforms[platform];
      if (!cfg?.shareEnabled) continue;
    }

    let href = '';
    switch (platform) {
      case 'facebook':
        href = `https://www.facebook.com/sharer/sharer.php?u=${encode(pageUrl)}`;
        break;
      case 'twitter':
        href = `https://twitter.com/intent/tweet?url=${encode(pageUrl)}${
          title ? `&text=${encode(title)}` : ''
        }`;
        break;
      case 'linkedin':
        href = `https://www.linkedin.com/sharing/share-offsite/?url=${encode(pageUrl)}`;
        break;
      case 'whatsapp':
        href = `https://wa.me/?text=${encode(text)}`;
        break;
      case 'instagram':
      case 'youtube':
      case 'tiktok':
        // These platforms do not expose a generic web share intent; link to profile when set.
        href = opts.settings?.platforms[platform]?.profileUrl?.trim() || '';
        break;
      default:
        href = '';
    }

    if (!href) continue;
    items.push({
      platform,
      label: SOCIAL_PLATFORM_LABELS[platform],
      href,
    });
  }

  return items;
}
