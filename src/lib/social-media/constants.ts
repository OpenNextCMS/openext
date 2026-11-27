import type {
  ISocialMediaSettings,
  SocialPlatformId,
} from '@/types/social-media';

export const SOCIAL_MEDIA_PLUGIN_ID = 'social-media';
export const SOCIAL_MEDIA_VERSION = '3.0.1';

export const SOCIAL_MEDIA_PLUGIN_DEFAULTS = {
  name: 'Social Media Integration',
  description: 'Connect profiles, configure share buttons, and queue posts for social platforms.',
  author: 'SocialConnect',
  type: 'social',
  kind: 'system' as const,
  icon: '🌐',
  source: 'marketplace' as const,
  adminEntry: '/dashboard/plugins/social-media',
};

export const SOCIAL_PLATFORM_IDS: SocialPlatformId[] = [
  'facebook',
  'twitter',
  'linkedin',
  'instagram',
  'youtube',
  'tiktok',
  'whatsapp',
];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatformId, string> = {
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
};

export const DEFAULT_SOCIAL_MEDIA_SETTINGS: ISocialMediaSettings = {
  platforms: {
    facebook: { enabled: false, profileUrl: '', shareEnabled: true },
    twitter: { enabled: false, profileUrl: '', shareEnabled: true },
    linkedin: { enabled: false, profileUrl: '', shareEnabled: true },
    instagram: { enabled: false, profileUrl: '', shareEnabled: false },
    youtube: { enabled: false, profileUrl: '', shareEnabled: false },
    tiktok: { enabled: false, profileUrl: '', shareEnabled: false },
    whatsapp: { enabled: false, profileUrl: '', shareEnabled: true },
  },
  shareDefaults: {
    showOnBlogs: true,
    showOnPages: false,
    buttonStyle: 'icon-label',
    openInNewTab: true,
  },
  openGraph: {
    siteName: '',
    defaultImage: '',
    twitterCard: 'summary_large_image',
  },
};
