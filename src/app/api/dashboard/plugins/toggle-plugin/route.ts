import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { disableBackendPlugin, enableBackendPlugin } from '@/lib/plugins/server/lifecycle';

export async function PATCH(req: NextRequest) {
  try {
    const { pluginId, isActive } = await req.json();
    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const existing = await PluginModel.findOne({ pluginId });
    if (!existing) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    const updatedPlugin = await PluginModel.findOneAndUpdate(
      { pluginId },
      { isActive },
      { new: true }
    );

    if (!updatedPlugin) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    if (updatedPlugin.hasBackend && updatedPlugin.serverEntry) {
      try {
        if (isActive) {
          await enableBackendPlugin({
            pluginId: updatedPlugin.pluginId,
            serverEntry: updatedPlugin.serverEntry,
            permissions: updatedPlugin.permissions || [],
          });
        } else {
          await disableBackendPlugin(updatedPlugin.pluginId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Backend plugin toggle failed';
        await PluginModel.updateOne({ pluginId }, { loadError: message });
        return NextResponse.json({ message }, { status: 500 });
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
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
