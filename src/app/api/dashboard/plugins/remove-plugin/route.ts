import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel, getPluginDataModel } from '@/utils/db';
import { removePluginDirectory } from '@/lib/plugins/storage';
import { uninstallBackendPlugin } from '@/lib/plugins/server/lifecycle';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pluginId = searchParams.get('pluginId');

    if (!pluginId) {
      return NextResponse.json({ message: 'Plugin ID is required' }, { status: 400 });
    }

    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const deletedPlugin = await PluginModel.findOneAndDelete({ pluginId });

    if (!deletedPlugin) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    if (deletedPlugin.hasBackend) {
      await uninstallBackendPlugin(pluginId, {
        uninstallHook: deletedPlugin.uninstallHook,
        permissions: deletedPlugin.permissions || [],
        dropMigrations: false,
      });
    }

    if (deletedPlugin.source === 'uploaded' || deletedPlugin.entryPoint?.startsWith('/plugins/')) {
      await removePluginDirectory(pluginId);
      try {
        const PluginData = getPluginDataModel();
        await PluginData.deleteMany({ pluginId });
      } catch {
        // PluginData model may not exist on older DBs; ignore cleanup failure
      }
    }

    return NextResponse.json({ message: 'Plugin removed successfully' }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
