import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { extractPluginZip } from '@/lib/plugins/extract';
import { MAX_PLUGIN_ZIP_BYTES } from '@/lib/plugins/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ message: 'Only .zip plugin packages are supported' }, { status: 400 });
    }

    if (file.size > MAX_PLUGIN_ZIP_BYTES) {
      return NextResponse.json(
        { message: `Plugin package exceeds the ${Math.floor(MAX_PLUGIN_ZIP_BYTES / (1024 * 1024))}MB limit` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const extracted = await extractPluginZip(arrayBuffer);

    await getUserDbConnection();
    const PluginModel = getPluginModel();

    const existingPlugin = await PluginModel.findOne({ pluginId: extracted.manifest.pluginId });
    if (existingPlugin) {
      const { removePluginDirectory } = await import('@/lib/plugins/storage');
      await removePluginDirectory(extracted.manifest.pluginId);
      return NextResponse.json(
        { message: `Plugin "${extracted.manifest.pluginId}" is already installed` },
        { status: 409 }
      );
    }

    let newPlugin;
    try {
      newPlugin = await PluginModel.create({
        pluginId: extracted.manifest.pluginId,
        name: extracted.manifest.name,
        version: extracted.manifest.version,
        description: extracted.manifest.description || 'Custom plugin uploaded by user',
        author: extracted.manifest.author || 'Unknown',
        type: extracted.manifest.type || extracted.kind,
        kind: extracted.kind,
        isActive: true,
        icon: extracted.manifest.icon || '🧩',
        entryPoint: extracted.entryPoint,
        adminEntry: extracted.adminEntry,
        blockEntry: extracted.blockEntry,
        customElement: extracted.manifest.customElement,
        styles: extracted.styles,
        source: 'uploaded',
      });
    } catch (dbError) {
      const { removePluginDirectory } = await import('@/lib/plugins/storage');
      await removePluginDirectory(extracted.manifest.pluginId);
      throw dbError;
    }

    const kindLabel = extracted.kind === 'system' ? 'system (dashboard)' : 'block (editor)';
    return NextResponse.json(
      {
        plugin: newPlugin,
        kind: extracted.kind,
        message: `Plugin extracted and installed as a ${kindLabel} plugin`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Plugin upload error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      message.includes('manifest.json') ||
      message.includes('package') ||
      message.includes('System plugin') ||
      message.includes('Block plugin') ||
      message.includes('entryPoint') ||
      message.includes('admin')
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
