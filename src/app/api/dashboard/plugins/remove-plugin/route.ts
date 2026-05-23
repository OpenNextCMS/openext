import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';

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

    return NextResponse.json({ message: 'Plugin removed successfully' }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
