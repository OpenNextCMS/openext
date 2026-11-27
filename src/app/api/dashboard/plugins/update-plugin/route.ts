import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';

export async function PATCH(req: NextRequest) {
  try {
    await requireCapability('plugins.manage');
    const { pluginId, name, description, version, icon } = await req.json();

    if (!pluginId) {
      return NextResponse.json({ message: 'Plugin ID is required' }, { status: 400 });
    }

    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const updatedPlugin = await PluginModel.findOneAndUpdate(
      { pluginId },
      { name, description, version, icon },
      { new: true }
    );

    if (!updatedPlugin) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    return NextResponse.json({
      plugin: updatedPlugin,
      message: 'Plugin updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
