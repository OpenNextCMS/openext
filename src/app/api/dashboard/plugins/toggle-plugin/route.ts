import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';

export async function PATCH(req: NextRequest) {
  try {
    const { pluginId, isActive } = await req.json();
    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const updatedPlugin = await PluginModel.findOneAndUpdate(
      { pluginId },
      { isActive },
      { new: true }
    );

    if (!updatedPlugin) {
      return NextResponse.json({ message: 'Plugin not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      plugin: updatedPlugin, 
      message: `Plugin ${isActive ? 'enabled' : 'disabled'} successfully` 
    }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
