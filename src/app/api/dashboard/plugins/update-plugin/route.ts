import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';

export async function PATCH(req: NextRequest) {
  try {
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
      message: 'Plugin updated successfully' 
    }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
