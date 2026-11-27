import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import {
  activateBackendPlugin,
  disableBackendPlugin,
} from '@/lib/plugins/server/lifecycle';
import { assertCmsDependenciesAvailable, CmsDependencyError } from '@/lib/cmsDependencies';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { invalidateSocialMediaPluginStateCache } from '@/lib/social-media/lifecycle';
import { SOCIAL_MEDIA_PLUGIN_ID } from '@/lib/social-media/constants';

export async function PATCH(req: NextRequest) {
  try {
    await requireCapability('plugins.manage');
    const { pluginId, isActive } = await req.json();
    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const existing = await PluginModel.findOne({ pluginId });
    if (!existing) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    if (isActive && (existing.dependencies?.length ?? 0) > 0) {
      assertCmsDependenciesAvailable(
        existing.dependencies ?? [],
        `Plugin "${pluginId}"`
      );
    }

    const updatedPlugin = await PluginModel.findOneAndUpdate(
      { pluginId },
      { isActive },
      { new: true }
    );

    if (!updatedPlugin) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    if (
      pluginId === SOCIAL_MEDIA_PLUGIN_ID ||
      pluginId === 'market-4' ||
      updatedPlugin.type === 'social'
    ) {
      invalidateSocialMediaPluginStateCache();
    }

    if (updatedPlugin.hasBackend && updatedPlugin.serverEntry) {
      try {
        if (isActive) {
          await activateBackendPlugin({
            pluginId: updatedPlugin.pluginId,
            serverEntry: updatedPlugin.serverEntry,
            permissions: updatedPlugin.permissions || [],
            dependencies: updatedPlugin.dependencies || [],
            migrations: updatedPlugin.migrations || [],
            installHook: updatedPlugin.installHook,
            uninstallHook: updatedPlugin.uninstallHook,
            loadedAt: updatedPlugin.loadedAt,
          });
        } else {
          await disableBackendPlugin(updatedPlugin.pluginId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Backend plugin toggle failed';
        await PluginModel.updateOne({ pluginId }, { isActive: false, loadError: message });
        return NextResponse.json(
          {
            plugin: await PluginModel.findOne({ pluginId }),
            message,
            ...(error instanceof CmsDependencyError
              ? { code: 'CMS_DEPENDENCY_MISSING', pendingDependencies: error.missing }
              : {}),
          },
          { status: error instanceof CmsDependencyError ? 400 : 500 }
        );
      }
    }

    return NextResponse.json(
      {
        plugin: updatedPlugin,
        message: `Plugin ${isActive ? 'enabled' : 'disabled'} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof CmsDependencyError) {
      return NextResponse.json(
        {
          message: error.message,
          code: 'CMS_DEPENDENCY_MISSING',
          pendingDependencies: error.missing,
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
