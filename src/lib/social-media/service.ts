import {
  getPageDbConnection,
  getSocialMediaSettingsModel,
  getSocialMediaPostModel,
} from '@/utils/db';
import {
  DEFAULT_SOCIAL_MEDIA_SETTINGS,
  SOCIAL_PLATFORM_IDS,
} from '@/lib/social-media/constants';
import type {
  ISocialMediaPost,
  ISocialMediaSettings,
  SocialPlatformConfig,
  SocialPlatformId,
} from '@/types/social-media';

function mergePlatforms(
  incoming?: Partial<Record<SocialPlatformId, Partial<SocialPlatformConfig>>>
): Record<SocialPlatformId, SocialPlatformConfig> {
  const base = structuredClone(DEFAULT_SOCIAL_MEDIA_SETTINGS.platforms);
  if (!incoming) return base;
  for (const id of SOCIAL_PLATFORM_IDS) {
    const patch = incoming[id];
    if (!patch) continue;
    base[id] = {
      enabled: typeof patch.enabled === 'boolean' ? patch.enabled : base[id].enabled,
      profileUrl:
        typeof patch.profileUrl === 'string' ? patch.profileUrl.trim() : base[id].profileUrl,
      shareEnabled:
        typeof patch.shareEnabled === 'boolean' ? patch.shareEnabled : base[id].shareEnabled,
    };
  }
  return base;
}

export async function getOrCreateSocialMediaSettings(): Promise<ISocialMediaSettings> {
  const pageDb = await getPageDbConnection();
  const Model = getSocialMediaSettingsModel(pageDb);
  let doc = await Model.findOne().lean().exec();
  if (!doc) {
    const created = await Model.create(DEFAULT_SOCIAL_MEDIA_SETTINGS);
    doc = created.toObject();
  }
  return {
    ...DEFAULT_SOCIAL_MEDIA_SETTINGS,
    ...(doc as ISocialMediaSettings),
    platforms: mergePlatforms((doc as ISocialMediaSettings).platforms),
    shareDefaults: {
      ...DEFAULT_SOCIAL_MEDIA_SETTINGS.shareDefaults,
      ...((doc as ISocialMediaSettings).shareDefaults || {}),
    },
    openGraph: {
      ...DEFAULT_SOCIAL_MEDIA_SETTINGS.openGraph,
      ...((doc as ISocialMediaSettings).openGraph || {}),
    },
  };
}

export async function updateSocialMediaSettings(
  patch: Partial<ISocialMediaSettings>
): Promise<ISocialMediaSettings> {
  const current = await getOrCreateSocialMediaSettings();
  const next: ISocialMediaSettings = {
    platforms: mergePlatforms(patch.platforms ?? current.platforms),
    shareDefaults: {
      ...current.shareDefaults,
      ...(patch.shareDefaults || {}),
    },
    openGraph: {
      ...current.openGraph,
      ...(patch.openGraph || {}),
    },
  };

  const pageDb = await getPageDbConnection();
  const Model = getSocialMediaSettingsModel(pageDb);
  const updated = await Model.findOneAndUpdate(
    {},
    { $set: next },
    { upsert: true, new: true }
  )
    .lean()
    .exec();

  return {
    ...DEFAULT_SOCIAL_MEDIA_SETTINGS,
    ...(updated as ISocialMediaSettings),
    platforms: mergePlatforms((updated as ISocialMediaSettings)?.platforms),
  };
}

export async function listSocialMediaPosts(): Promise<ISocialMediaPost[]> {
  const pageDb = await getPageDbConnection();
  const Model = getSocialMediaPostModel(pageDb);
  const rows = await Model.find().sort({ updatedAt: -1 }).lean().exec();
  return rows as ISocialMediaPost[];
}

export async function createSocialMediaPost(
  input: Pick<ISocialMediaPost, 'title' | 'url' | 'message' | 'platforms' | 'status' | 'scheduledAt'>
): Promise<ISocialMediaPost> {
  const pageDb = await getPageDbConnection();
  const Model = getSocialMediaPostModel(pageDb);
  const created = await Model.create({
    title: input.title.trim(),
    url: input.url.trim(),
    message: (input.message || '').trim(),
    platforms: (input.platforms || []).filter((p) =>
      SOCIAL_PLATFORM_IDS.includes(p as SocialPlatformId)
    ),
    status: input.status || 'draft',
    scheduledAt: input.scheduledAt || null,
    sharedAt: input.status === 'shared' ? new Date() : null,
  });
  return created.toObject() as ISocialMediaPost;
}

export async function updateSocialMediaPost(
  id: string,
  patch: Partial<ISocialMediaPost>
): Promise<ISocialMediaPost | null> {
  const pageDb = await getPageDbConnection();
  const Model = getSocialMediaPostModel(pageDb);
  const $set: Record<string, unknown> = {};
  if (typeof patch.title === 'string') $set.title = patch.title.trim();
  if (typeof patch.url === 'string') $set.url = patch.url.trim();
  if (typeof patch.message === 'string') $set.message = patch.message.trim();
  if (Array.isArray(patch.platforms)) {
    $set.platforms = patch.platforms.filter((p) =>
      SOCIAL_PLATFORM_IDS.includes(p as SocialPlatformId)
    );
  }
  if (patch.status) {
    $set.status = patch.status;
    if (patch.status === 'shared') $set.sharedAt = new Date();
  }
  if (patch.scheduledAt !== undefined) $set.scheduledAt = patch.scheduledAt || null;

  const updated = await Model.findByIdAndUpdate(id, { $set }, { new: true }).lean().exec();
  return (updated as ISocialMediaPost) || null;
}

export async function deleteSocialMediaPost(id: string): Promise<boolean> {
  const pageDb = await getPageDbConnection();
  const Model = getSocialMediaPostModel(pageDb);
  const res = await Model.findByIdAndDelete(id).exec();
  return !!res;
}
