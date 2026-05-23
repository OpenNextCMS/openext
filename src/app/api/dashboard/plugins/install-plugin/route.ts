import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';

export async function POST(req: NextRequest) {
  try {
    const pluginData = await req.json();
    await getUserDbConnection();
    const PluginModel = getPluginModel();

    // Check if already installed
    const existingPlugin = await PluginModel.findOne({ pluginId: pluginData.pluginId });
    if (existingPlugin) {
      return NextResponse.json({ message: 'Plugin already installed' }, { status: 400 });
    }

    const newPlugin = await PluginModel.create({
      ...pluginData,
      isActive: true, // Default to active on install
    });

    return NextResponse.json({ plugin: newPlugin, message: 'Plugin installed successfully' }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
