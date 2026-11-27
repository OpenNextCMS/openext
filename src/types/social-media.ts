export type SocialPlatformId =
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'whatsapp';

export type SocialShareButtonStyle = 'icon' | 'icon-label' | 'label';

export type SocialPostStatus = 'draft' | 'scheduled' | 'shared';

export interface SocialPlatformConfig {
  enabled: boolean;
  profileUrl: string;
  shareEnabled: boolean;
}

export interface SocialShareDefaults {
  showOnBlogs: boolean;
  showOnPages: boolean;
  buttonStyle: SocialShareButtonStyle;
  openInNewTab: boolean;
}

export interface SocialOpenGraphDefaults {
  siteName: string;
  defaultImage: string;
  twitterCard: 'summary' | 'summary_large_image';
}

export interface ISocialMediaSettings {
  platforms: Record<SocialPlatformId, SocialPlatformConfig>;
  shareDefaults: SocialShareDefaults;
  openGraph: SocialOpenGraphDefaults;
  updatedAt?: Date | string;
  createdAt?: Date | string;
}

export interface ISocialMediaPost {
  _id?: string;
  title: string;
  url: string;
  message: string;
  platforms: SocialPlatformId[];
  status: SocialPostStatus;
  scheduledAt?: Date | string | null;
  sharedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SocialPluginState {
  installed: boolean;
  enabled: boolean;
  version?: string;
}

export interface SocialShareUrlItem {
  platform: SocialPlatformId;
  label: string;
  href: string;
}
