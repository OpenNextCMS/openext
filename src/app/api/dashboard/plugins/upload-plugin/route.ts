import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Process the zip file with JSZip
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // In a real implementation, we would extract files to public/plugins/
    // and look for a manifest.json. For Phase 1, we'll simulate this.
    
    const pluginId = `plugin-${Date.now()}`;
    const name = file.name.replace('.zip', '');
    
    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const newPlugin = await PluginModel.create({
      pluginId,
      name,
      version: '1.0.0',
      description: 'Custom plugin uploaded by user',
      author: 'Unknown',
      isActive: true,
      icon: '🧩',
      entryPoint: `/plugins/${pluginId}/index.js`, // Predicted path
    });

    return NextResponse.json({ 
      plugin: newPlugin, 
      message: 'Plugin uploaded and registered successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
