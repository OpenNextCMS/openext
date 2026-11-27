import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel, getPluginDataModel } from '@/utils/db';
import { removePluginDirectory } from '@/lib/plugins/storage';
import { uninstallBackendPlugin } from '@/lib/plugins/server/lifecycle';
import { unregisterPluginDependencies, formatPluginDependencyRemovalMessage } from '@/lib/cmsDependencies';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { unregisterPluginUserTypes } from '@/lib/rbac/pluginUserTypes';
import { invalidateSocialMediaPluginStateCache } from '@/lib/social-media/lifecycle';
import { SOCIAL_MEDIA_PLUGIN_ID } from '@/lib/social-media/constants';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

export async function DELETE(req: NextRequest) {
  try {
    await requireCapability('plugins.manage');
    const { searchParams } = new URL(req.url);
    const pluginId = searchParams.get('pluginId');

    if (!pluginId) {
      return NextResponse.json({ message: 'Plugin ID is required' }, { status: 400 });
    }

    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const deletedPlugin = await PluginModel.findOneAndDelete({ pluginId }).lean();

    if (!deletedPlugin) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    const pluginType = typeof deletedPlugin.type === 'string' ? deletedPlugin.type : '';
    const hasBackend = Boolean(deletedPlugin.hasBackend);
    const source = typeof deletedPlugin.source === 'string' ? deletedPlugin.source : '';
    const entryPoint =
      typeof deletedPlugin.entryPoint === 'string' ? deletedPlugin.entryPoint : '';
    const uninstallHook =
      typeof deletedPlugin.uninstallHook === 'string' ? deletedPlugin.uninstallHook : undefined;
    const permissions = asStringArray(deletedPlugin.permissions);
    const dependencies = asStringArray(deletedPlugin.dependencies);

    if (
      pluginId === SOCIAL_MEDIA_PLUGIN_ID ||
      pluginId === 'market-4' ||
      pluginType === 'social'
    ) {
      invalidateSocialMediaPluginStateCache();
    }

    try {
      await unregisterPluginUserTypes(pluginId);
    } catch (error) {
      console.error(`[plugin:${pluginId}] unregister user types failed:`, error);
    }

    if (hasBackend) {
      try {
        await uninstallBackendPlugin(pluginId, {
          uninstallHook,
          permissions,
          dropMigrations: false,
        });
      } catch (error) {
        console.error(`[plugin:${pluginId}] uninstall backend failed:`, error);
      }
    }

    if (source === 'uploaded' || entryPoint.startsWith('/plugins/')) {
      try {
        await removePluginDirectory(pluginId);
      } catch (error) {
        console.error(`[plugin:${pluginId}] remove frontend directory failed:`, error);
      }
      try {
        const PluginData = getPluginDataModel();
        await PluginData.deleteMany({ pluginId });
      } catch {
        // PluginData model may not exist on older DBs; ignore cleanup failure
      }
    }

    let dependencyCleanup = { removed: [] as string[], keptCore: [] as string[], keptShared: [] as string[] };
    try {
      dependencyCleanup = await unregisterPluginDependencies(dependencies, pluginId);
    } catch (error) {
      console.error(`[plugin:${pluginId}] unregister dependencies failed:`, error);
    }

    return NextResponse.json(
      {
        message: formatPluginDependencyRemovalMessage(dependencyCleanup),
        removedFromPackageJson: dependencyCleanup.removed,
        keptCoreDependencies: dependencyCleanup.keptCore,
        keptSharedDependencies: dependencyCleanup.keptShared,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
