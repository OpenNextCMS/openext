import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { invalidateSocialMediaPluginStateCache } from '@/lib/social-media/lifecycle';
import {
  SOCIAL_MEDIA_PLUGIN_DEFAULTS,
  SOCIAL_MEDIA_PLUGIN_ID,
} from '@/lib/social-media/constants';

export async function POST(req: NextRequest) {
  try {
    await requireCapability('plugins.manage');
    const pluginData = await req.json();
    await getUserDbConnection();
    const PluginModel = getPluginModel();

    let pluginId =
      typeof pluginData.pluginId === 'string' && pluginData.pluginId.trim()
        ? pluginData.pluginId.trim()
        : `market-${pluginData.id || Date.now()}`;

    // Stable id for Social Media Integration marketplace listing.
    if (
      pluginId === 'market-4' ||
      pluginData.type === 'social' ||
      (typeof pluginData.name === 'string' &&
        pluginData.name.toLowerCase().includes('social media'))
    ) {
      pluginId = SOCIAL_MEDIA_PLUGIN_ID;
    }

    const existingPlugin = await PluginModel.findOne({ pluginId });
    if (existingPlugin) {
      return NextResponse.json({ message: 'Plugin already installed' }, { status: 400 });
    }

    const isSocial = pluginId === SOCIAL_MEDIA_PLUGIN_ID;
    const newPlugin = await PluginModel.create({
      pluginId,
      name: pluginData.name || (isSocial ? SOCIAL_MEDIA_PLUGIN_DEFAULTS.name : 'Plugin'),
      version: pluginData.version || (isSocial ? '3.0.1' : '1.0.0'),
      description:
        pluginData.description ||
        (isSocial ? SOCIAL_MEDIA_PLUGIN_DEFAULTS.description : ''),
      author: pluginData.author || (isSocial ? SOCIAL_MEDIA_PLUGIN_DEFAULTS.author : ''),
      type: pluginData.type || (isSocial ? 'social' : undefined),
      kind: pluginData.kind || (isSocial ? 'system' : 'block'),
      icon: pluginData.icon || (isSocial ? SOCIAL_MEDIA_PLUGIN_DEFAULTS.icon : '🔌'),
      source: pluginData.source || 'marketplace',
      adminEntry:
        pluginData.adminEntry ||
        (isSocial ? SOCIAL_MEDIA_PLUGIN_DEFAULTS.adminEntry : undefined),
      isActive: pluginData.isActive !== false,
    });

    if (isSocial) invalidateSocialMediaPluginStateCache();

    return NextResponse.json({ plugin: newPlugin, message: 'Plugin installed successfully' }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
