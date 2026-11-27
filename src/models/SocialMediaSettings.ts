import { Schema } from 'mongoose';
import type {
  ISocialMediaPost,
  ISocialMediaSettings,
  SocialPlatformId,
} from '@/types/social-media';
import { SOCIAL_PLATFORM_IDS } from '@/lib/social-media/constants';

const PlatformConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    profileUrl: { type: String, default: '' },
    shareEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const platformsShape: Record<string, unknown> = {};
for (const id of SOCIAL_PLATFORM_IDS) {
  platformsShape[id] = { type: PlatformConfigSchema, default: () => ({}) };
}

export const SocialMediaSettingsSchema = new Schema<ISocialMediaSettings>(
  {
    platforms: {
      type: platformsShape,
      default: () => ({}),
    },
    shareDefaults: {
      showOnBlogs: { type: Boolean, default: true },
      showOnPages: { type: Boolean, default: false },
      buttonStyle: {
        type: String,
        enum: ['icon', 'icon-label', 'label'],
        default: 'icon-label',
      },
      openInNewTab: { type: Boolean, default: true },
    },
    openGraph: {
      siteName: { type: String, default: '' },
      defaultImage: { type: String, default: '' },
      twitterCard: {
        type: String,
        enum: ['summary', 'summary_large_image'],
        default: 'summary_large_image',
      },
    },
  },
  { timestamps: true, collection: 'social_media_settings' }
);

export const SocialMediaPostSchema = new Schema<ISocialMediaPost>(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    message: { type: String, default: '' },
    platforms: {
      type: [{ type: String, enum: SOCIAL_PLATFORM_IDS as SocialPlatformId[] }],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'shared'],
      default: 'draft',
    },
    scheduledAt: { type: Date, default: null },
    sharedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'social_media_posts' }
);
